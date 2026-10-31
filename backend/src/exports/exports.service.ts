import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PartnerStatus, RoleName, UserStatus } from "@prisma/client";
import { json2csv } from "json-2-csv";
import { randomUUID } from "node:crypto";
import { AuthenticatedUser } from "../auth/auth-user.interface";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ExportsService {
    constructor(private readonly prisma: PrismaService) { }

    async exportProgramRegistrations(actor: AuthenticatedUser, programId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: actor.id },
            include: { role: true, partnerMembership: true },
        });

        if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
            throw new ForbiddenException("Tài khoản không hoạt động.");
        }

        const program = await this.prisma.program.findUnique({
            where: { id: programId },
        });
        if (!program) throw new BadRequestException("Không tìm thấy chương trình.");

        const isAdmin = user.role.name === RoleName.ADMIN;
        const isOwner = user.partnerMembership?.id === program.ownerPartnerId && user.partnerMembership?.status === PartnerStatus.ACTIVE;

        if (!isAdmin && !isOwner) {
            throw new ForbiddenException("Bạn không có quyền xuất dữ liệu chương trình này.");
        }

        const registrations = await this.prisma.supportProgramRegistration.findMany({
            where: { programId },
            orderBy: { registeredAt: "desc" },
            take: 10000,
        });

        if (registrations.length === 0) {
            throw new BadRequestException("Chương trình chưa có người đăng ký.");
        }

        const dataForCsv = registrations.map((reg, index) => ({
            "STT": index + 1,
            "Họ và tên": this.sanitizeCsvCell(reg.applicantName),
            "Email": this.sanitizeCsvCell(reg.applicantEmail),
            "Trạng thái": this.sanitizeCsvCell(String(reg.status)),
            "Ngày đăng ký": reg.registeredAt.toISOString(),
            "Ngày xác nhận": reg.confirmedAt?.toISOString() || "",
            "Ghi chú": this.sanitizeCsvCell(reg.decisionReason || ""),
        }));

        const csvString = await json2csv(dataForCsv);

        await this.prisma.auditLog.create({
            data: {
                actorType: "USER",
                actorId: actor.id,
                action: "EXPORT_CSV_REGISTRATIONS",
                entityType: "PROGRAM",
                entityId: programId,
                after: { rows: registrations.length },
                correlationId: randomUUID(),
            },
        });

        return {
            buffer: Buffer.from("\uFEFF" + csvString, "utf-8"),
            fileName: `danh-sach-dang-ky-${program.title.replace(/\s+/g, "-")}.csv`,
        };
    }

    private sanitizeCsvCell(value: string): string {
        if (/^[=+\-@\t\r]/.test(value)) {
            return `'${value}`;
        }
        return value;
    }
}