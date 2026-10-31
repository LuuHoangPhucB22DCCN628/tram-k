import * as ExcelJS from "exceljs";

import { parseDonationAmount, parseDonationDate } from "./donations.service";
import { DonationsService } from "./donations.service";
import { parseStatement } from "./statement-parser";

describe("statement import validation", () => {
  it("reads semicolon-separated UTF-8 CSV without storing the file", async () => {
    const parsed = await parseStatement({
      originalname: "statement.csv",
      buffer: Buffer.from("Ngày;Mã;Tiền vào\n03/06/2026;A-1;1.000.000\n"),
    });
    expect(parsed.sheets).toEqual(["CSV"]);
    expect(parsed.rows[1]).toEqual(["03/06/2026", "A-1", "1.000.000"]);
  });

  it("reads a selected Excel sheet", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Other").addRow(["ignore"]);
    const sheet = workbook.addWorksheet("Transactions");
    sheet.addRow(["Date", "Credit"]);
    sheet.addRow(["03/06/2026", 50000]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const parsed = await parseStatement({ originalname: "bank.xlsx", buffer }, "Transactions");
    expect(parsed.sheets).toEqual(["Other", "Transactions"]);
    expect(parsed.rows[1]).toEqual(["03/06/2026", "50000"]);
  });

  it("rejects wrong file formats and invalid money", async () => {
    await expect(parseStatement({ originalname: "bank.xlsm", buffer: Buffer.from("x") })).rejects.toThrow();
    expect(parseDonationAmount("1.000.000,00")).toBe(1000000n);
    expect(parseDonationAmount("1.000.000,50")).toBeNull();
    expect(parseDonationAmount("-100.000")).toBeNull();
  });

  it("validates Vietnamese dates instead of rolling invalid dates forward", () => {
    expect(parseDonationDate("03/06/2026 18:36")?.toISOString()).toBe("2026-06-03T11:36:00.000Z");
    expect(parseDonationDate("31/02/2026")).toBeNull();
  });
});

describe("donation publication rules", () => {
  const admin = { status: "ACTIVE", deletedAt: null, role: { name: "ADMIN" } };

  it("imports valid money-in rows only as pending and reports duplicates", async () => {
    const transaction = {
      donationStatementImport: { create: jest.fn().mockResolvedValue({ id: "batch-1" }), update: jest.fn() },
      donationEntry: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(admin) },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const service = new DonationsService(prisma as never);
    const csv = Buffer.from("Date,Reference,Credit,Debit\n03/06/2026 18:36,A-1,50000,\n03/06/2026 18:37,A-2,100000,\n03/06/2026 18:38,A-3,,20000\n");
    const result = await service.import("admin-1", { originalname: "bank.csv", buffer: csv }, JSON.stringify({
      accountKey: "BANK-123", headerRow: 1, mapping: { date: 0, reference: 1, credit: 2, debit: 3 },
    }));
    expect(result).toMatchObject({ addedCount: 1, duplicateCount: 1, outgoingCount: 1 });
    expect(transaction.donationEntry.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
    const created = transaction.donationEntry.createMany.mock.calls[0][0].data;
    expect(created).toHaveLength(2);
    expect(created.every((entry: { status?: string }) => !entry.status)).toBe(true);
  });

  it("publishes confirmed entries only and never returns bank narration", async () => {
    const prisma = {
      donationEntry: {
        findMany: jest.fn().mockResolvedValue([{ id: "donation-1", occurredAt: new Date("2026-06-03"), amountVnd: 50000n }]),
        aggregate: jest.fn().mockResolvedValue({ _count: { id: 1 }, _sum: { amountVnd: 50000n } }),
      },
    };
    const result = await new DonationsService(prisma as never).publicList();
    expect(prisma.donationEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "CONFIRMED" } }));
    expect(result.items[0]).toMatchObject({ name: "Người quyên góp ẩn danh", amountVnd: "50000" });
    expect(result.items[0]).not.toHaveProperty("description");
  });
});
