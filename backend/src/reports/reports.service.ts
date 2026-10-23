import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { ModerationTargetType, ReportStatus, RoleName } from "@prisma/client";
import { randomUUID } from "crypto";

import { PrismaService } from "../prisma/prisma.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { ReportDecision, ReviewReportDto } from "./dto/review-report.dto";

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, dto: CreateReportDto) {
        const existing = await this.prisma.report.findFirst({
            where: {
                reporterId: userId,
                targetType: dto.targetType,
                targetId: dto.targetId,
                status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW] },
            },
        });
        if (existing) throw new ConflictException("Bạn đã báo cáo nội dung này rồi.");

        const correlationId = randomUUID();

        return this.prisma.$transaction(async (transaction) => {
            const report = await transaction.report.create({
                data: {
                    reporterId: userId,
                    targetType: dto.targetType,
                    targetId: dto.targetId,
                    reasonCode: dto.reasonCode,
                    details: dto.details || null,
                    snapshot: { note: "Snapshot nội dung tại thời điểm báo cáo" },
                    status: ReportStatus.OPEN,
                },
            });

            await transaction.auditLog.create({
                data: {
                    actorType: "USER",
                    actorId: userId,
                    action: "CREATE_REPORT",
                    entityType: "REPORT",
                    entityId: report.id,
                    after: { status: ReportStatus.OPEN },
                    correlationId,
                },
            });

            return report;
        });
    }

    async review(adminId: string, reportId: string, dto: ReviewReportDto) {
        const admin = await this.prisma.user.findUnique({
            where: { id: adminId },
            include: { role: true },
        });
        if (!admin || admin.role.name !== RoleName.ADMIN) {
            throw new ForbiddenException("Chỉ Admin được xử lý báo cáo.");
        }

        const report = await this.prisma.report.findUnique({
            where: { id: reportId },
        });
        if (!report) throw new NotFoundException("Không tìm thấy báo cáo.");
        if (report.status !== ReportStatus.OPEN && report.status !== ReportStatus.IN_REVIEW) {
            throw new BadRequestException("Báo cáo đã được xử lý.");
        }

        const isResolved = dto.decision === ReportDecision.RESOLVE;
        const correlationId = randomUUID();

        return this.prisma.$transaction(async (transaction) => {
            const updated = await transaction.report.update({
                where: { id: reportId },
                data: {
                    status: isResolved ? ReportStatus.RESOLVED : ReportStatus.DISMISSED,
                    reviewedById: adminId,
                    reviewedAt: new Date(),
                    resolutionCode: isResolved ? "RESOLVED" : "DISMISSED",
                },
            });

            await transaction.auditLog.create({
                data: {
                    actorType: "USER",
                    actorId: adminId,
                    action: isResolved ? "RESOLVE_REPORT" : "DISMISS_REPORT",
                    entityType: "REPORT",
                    entityId: reportId,
                    before: { status: report.status },
                    after: { status: updated.status },
                    reason: dto.reason,
                    correlationId,
                },
            });

            return updated;
        });
    }
}