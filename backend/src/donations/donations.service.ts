import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DonationEntryStatus, RoleName, SupportProgramRegistrationStatus, UserStatus } from "@prisma/client";
import { createHash } from "crypto";

import { PrismaService } from "../prisma/prisma.service";
import { parseStatement, StatementFile } from "./statement-parser";

interface ColumnMapping {
  readonly date: number;
  readonly amount?: number;
  readonly credit?: number;
  readonly reference?: number;
  readonly debit?: number;
  readonly direction?: number;
  readonly description?: number;
}

interface ImportOptions {
  readonly accountKey: string;
  readonly sheet?: string;
  readonly headerRow: number;
  readonly mapping: ColumnMapping;
}

interface ParsedEntry {
  readonly sourceKey: string;
  readonly sourceReference: string | null;
  readonly occurredAt: Date;
  readonly amountVnd: bigint;
  readonly description: string | null;
}

@Injectable()
export class DonationsService {
  constructor(private readonly prisma: PrismaService) {}

  async inspect(adminId: string, file: StatementFile | undefined, sheet?: string) {
    await this.requireAdmin(adminId);
    const statement = await parseStatement(file, sheet);
    return { sheets: statement.sheets, selectedSheet: statement.selectedSheet, rows: statement.rows.slice(0, 15), totalRows: statement.rows.length };
  }

  async import(adminId: string, file: StatementFile | undefined, rawOptions: string) {
    await this.requireAdmin(adminId);
    if (!file) throw new BadRequestException("Vui lòng chọn tệp sao kê.");
    let options: ImportOptions;
    try {
      options = JSON.parse(rawOptions) as ImportOptions;
    } catch {
      throw new BadRequestException("Cấu hình cột không hợp lệ.");
    }
    const accountKey = options.accountKey?.trim().replace(/\s+/g, "").toUpperCase();
    if (!accountKey || accountKey.length > 100) throw new BadRequestException("Cần nhập tài khoản nhận tiền để đối soát.");
    const statement = await parseStatement(file, options.sheet);
    const headerRow = Number(options.headerRow);
    if (!Number.isInteger(headerRow) || headerRow < 1 || headerRow >= statement.rows.length) {
      throw new BadRequestException("Dòng tiêu đề không hợp lệ.");
    }
    const mapping = options.mapping;
    const width = Math.max(...statement.rows.map((row) => row.length));
    const hasSignedAmount = mapping?.amount !== undefined && validColumn(mapping.amount, width);
    const hasCredit = mapping?.credit !== undefined && validColumn(mapping.credit, width);
    if (!mapping || !validColumn(mapping.date, width) || (!hasSignedAmount && !hasCredit) ||
        (mapping.amount !== undefined && !validColumn(mapping.amount, width)) ||
        (mapping.credit !== undefined && !validColumn(mapping.credit, width)) ||
        (mapping.reference !== undefined && !validColumn(mapping.reference, width)) ||
        (mapping.debit !== undefined && !validColumn(mapping.debit, width)) ||
        (mapping.direction !== undefined && !validColumn(mapping.direction, width)) ||
        (mapping.description !== undefined && !validColumn(mapping.description, width))) {
      throw new BadRequestException("Vui lòng ghép cột ngày giờ và chọn một cột số tiền có dấu hoặc cột tiền vào.");
    }
    if (hasSignedAmount && (mapping.credit !== undefined || mapping.debit !== undefined)) {
      throw new BadRequestException("Chỉ chọn một cách đọc số tiền: một cột có dấu hoặc hai cột tiền vào/tiền ra.");
    }
    const selectedColumns = [mapping.date, mapping.amount, mapping.credit, mapping.reference,
      mapping.debit, mapping.direction, mapping.description]
      .filter((value): value is number => value !== undefined);
    if (new Set(selectedColumns).size !== selectedColumns.length) {
      throw new BadRequestException("Mỗi trường phải được ghép với một cột khác nhau.");
    }
    const fileHash = createHash("sha256").update(file.buffer).digest("hex");
    const accepted: ParsedEntry[] = [];
    const errors: { row: number; message: string }[] = [];
    let outgoingCount = 0;
    for (let index = headerRow; index < statement.rows.length; index += 1) {
      const row = statement.rows[index];
      if (row.every((cell) => !cell.trim())) continue;
      const occurredAt = parseDonationDate(row[mapping.date]);
      const amount = this.moneyIn(row, mapping);
      if (amount.kind === "OUTGOING") {
        outgoingCount += 1;
        continue;
      }
      if (!occurredAt || amount.kind !== "INCOMING") {
        errors.push({ row: index + 1, message: "Ngày giờ hoặc số tiền vào không hợp lệ." });
        continue;
      }
      const credit = amount.value;
      const reference = mapping.reference === undefined ? "" : (row[mapping.reference] || "").trim();
      const description = mapping.description === undefined ? "" : (row[mapping.description] || "").trim();
      const keyInput = reference ? `${accountKey}|ref|${reference.toLowerCase()}` :
        `${accountKey}|fallback|${occurredAt.toISOString()}|${credit}|${description.toLowerCase()}`;
      accepted.push({
        sourceKey: createHash("sha256").update(keyInput).digest("hex"),
        sourceReference: reference.slice(0, 255) || null,
        occurredAt,
        amountVnd: credit,
        description: description.slice(0, 1000) || null,
      });
    }
    if (!accepted.length) throw new BadRequestException("Không có giao dịch tiền vào hợp lệ để nhập.");
    const result = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.donationStatementImport.create({ data: {
        fileName: file.originalname.slice(0, 255), fileHash, accountKey,
        importedBy: adminId, rowCount: statement.rows.length - headerRow,
      } });
      const inserted = await tx.donationEntry.createMany({
        data: accepted.map((entry) => ({ ...entry, importId: batch.id })),
        skipDuplicates: true,
      });
      await tx.donationStatementImport.update({ where: { id: batch.id }, data: { addedCount: inserted.count } });
      return { batchId: batch.id, addedCount: inserted.count };
    });
    return { ...result, duplicateCount: accepted.length - result.addedCount, outgoingCount, errors, pendingReview: result.addedCount };
  }

  private moneyIn(
    row: readonly string[],
    mapping: ColumnMapping,
  ): { readonly kind: "INCOMING"; readonly value: bigint } |
    { readonly kind: "OUTGOING" | "INVALID" } {
    if (mapping.amount !== undefined) {
      const amount = parseSignedDonationAmount(row[mapping.amount]);
      if (amount === null || amount === 0n) return { kind: "INVALID" };
      const direction = mapping.direction === undefined
        ? ""
        : normalizeDirection(row[mapping.direction]);
      if (direction === "OUTGOING") return { kind: "OUTGOING" };
      if (direction === "INCOMING") {
        return amount > 0n ? { kind: "INCOMING", value: amount } : { kind: "INVALID" };
      }
      return amount > 0n
        ? { kind: "INCOMING", value: amount }
        : { kind: "OUTGOING" };
    }

    const credit = mapping.credit === undefined ? null : parseDonationAmount(row[mapping.credit]);
    const debit = mapping.debit === undefined ? 0n : parseDonationAmount(row[mapping.debit]);
    if (credit === null || debit === null || (credit > 0n && debit > 0n)) return { kind: "INVALID" };
    if (debit > 0n) return { kind: "OUTGOING" };
    return credit && credit > 0n
      ? { kind: "INCOMING", value: credit }
      : { kind: "INVALID" };
  }

  async listAdmin(adminId: string, status: DonationEntryStatus = DonationEntryStatus.PENDING) {
    await this.requireAdmin(adminId);
    if (!Object.values(DonationEntryStatus).includes(status)) throw new BadRequestException("Trạng thái không hợp lệ.");
    const entries = await this.prisma.donationEntry.findMany({
      where: { status }, include: { statementImport: { select: { fileName: true, accountKey: true } } },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 100,
    });
    return entries.map((entry) => ({ ...entry, amountVnd: entry.amountVnd.toString() }));
  }

  async review(adminId: string, ids: readonly string[], status: DonationEntryStatus, note?: string) {
    await this.requireAdmin(adminId);
    if (status !== DonationEntryStatus.CONFIRMED && status !== DonationEntryStatus.REJECTED) {
      throw new BadRequestException("Chỉ có thể xác nhận hoặc từ chối giao dịch chờ duyệt.");
    }
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 || ids.some((id) => typeof id !== "string" || !id)) {
      throw new BadRequestException("Hãy chọn từ 1 đến 100 giao dịch.");
    }
    const uniqueIds = [...new Set(ids)];
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.donationEntry.updateMany({
        where: { id: { in: uniqueIds }, status: DonationEntryStatus.PENDING },
        data: { status, reviewedBy: adminId, reviewedAt: new Date(), reviewNote: note?.slice(0, 500) || null },
      });
      if (updated.count !== uniqueIds.length) throw new ConflictException("Một số giao dịch không còn chờ duyệt. Hãy tải lại danh sách.");
      return updated;
    });
    return { updatedCount: result.count };
  }

  async publicList(limit = 8, page = 1) {
    const take = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 50) : 8;
    const safePage = Number.isInteger(page) ? Math.min(Math.max(page, 1), 10000) : 1;
    const [entries, totals, supportedPatients] = await Promise.all([
      this.prisma.donationEntry.findMany({ where: { status: DonationEntryStatus.CONFIRMED },
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take, skip: (safePage - 1) * take,
        select: { id: true, occurredAt: true, amountVnd: true } }),
      this.prisma.donationEntry.aggregate({ where: { status: DonationEntryStatus.CONFIRMED },
        _count: { id: true }, _sum: { amountVnd: true } }),
      this.prisma.supportProgramRegistration.findMany({
        where: {
          status: {
            in: [
              SupportProgramRegistrationStatus.CONFIRMED,
              SupportProgramRegistrationStatus.ATTENDED,
            ],
          },
          user: { role: { name: RoleName.PATIENT } },
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
    ]);
    return {
      items: entries.map((entry) => ({ id: entry.id, name: "Người quyên góp ẩn danh", occurredAt: entry.occurredAt, amountVnd: entry.amountVnd.toString() })),
      totalCount: totals._count.id, totalAmountVnd: (totals._sum.amountVnd ?? 0n).toString(),
      supportedPatientCount: supportedPatients.length,
      page: safePage, limit: take,
    };
  }

  private async requireAdmin(adminId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: adminId }, select: { status: true, deletedAt: true, role: { select: { name: true } } } });
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE || user.role.name !== RoleName.ADMIN) {
      throw new ForbiddenException("Chỉ quản trị viên đang hoạt động mới được quản lý sao kê.");
    }
  }
}

function validColumn(value: number, width: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < width;
}

export function parseDonationAmount(raw: string | undefined): bigint | null {
  const value = (raw || "").replace(/\s|đ|₫|vnd/gi, "");
  if (!value) return 0n;
  const withoutCents = value.replace(/[.,]00$/, "");
  if (/[.,]\d{1,2}$/.test(withoutCents)) return null;
  const digits = withoutCents.replace(/[.,]/g, "");
  return /^\d+$/.test(digits) ? BigInt(digits) : null;
}

export function parseSignedDonationAmount(raw: string | undefined): bigint | null {
  const source = (raw || "").trim();
  const negativeByParentheses = /^\(.*\)$/.test(source);
  const unwrapped = negativeByParentheses ? source.slice(1, -1) : source;
  const negative = negativeByParentheses || /^-/.test(unwrapped);
  const positive = /^\+/.test(unwrapped);
  const amount = parseDonationAmount(unwrapped.replace(/^[+-]/, ""));
  if (amount === null) return null;
  return negative ? -amount : positive ? amount : amount;
}

function normalizeDirection(raw: string | undefined): "INCOMING" | "OUTGOING" | "" {
  const value = (raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
  if (/tien\s*ra|giai ngan|chi\s|ghi no|debit|withdraw/.test(value)) return "OUTGOING";
  if (/tien\s*vao|ung ho|ghi co|credit|deposit|thu\s/.test(value)) return "INCOMING";
  return "";
}

export function parseDonationDate(raw: string | undefined): Date | null {
  const value = (raw || "").trim();
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
  const date = local
    ? new Date(`${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}T${(local[4] || "00").padStart(2, "0")}:${local[5] || "00"}:${local[6] || "00"}+07:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 86400000) return null;
  if (local) {
    const displayed = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
    if (displayed !== `${local[1].padStart(2, "0")}/${local[2].padStart(2, "0")}/${local[3]}`) return null;
  }
  return date;
}
