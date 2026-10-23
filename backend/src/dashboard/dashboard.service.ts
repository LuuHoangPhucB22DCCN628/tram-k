import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { PartnerApplicationStatus, PostStatus, ProgramStatus, ReportStatus, SupportProgramRegistrationStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { DashboardQueryDto } from "./dto/dashboard-query.dto";

@Injectable()
export class DashboardService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    async getOverview(query: DashboardQueryDto) {
        const cacheKey = `dashboard_overview:${JSON.stringify(query)}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;

        const now = new Date();
        const { from, to } = this.calculateTimeRange(query, now);

        const [activeUsersResult, newUsers, confirmedRegistrations] = await Promise.all([
            this.prisma.authAttempt.groupBy({
                by: ["userId"],
                where: { success: true, createdAt: { gte: from, lte: to } },
            }),
            this.prisma.user.count({
                where: { createdAt: { gte: from, lte: to }, deletedAt: null },
            }),
            this.prisma.registrationStatusHistory.groupBy({
                by: ["registrationId"],
                where: {
                    toStatus: SupportProgramRegistrationStatus.CONFIRMED,
                    createdAt: { gte: from, lte: to },
                },
            }),
        ]);

        const [pendingPosts, openReports, pendingPartnerApps, ongoingPrograms, waitlistedRegs] = await Promise.all([
            this.prisma.post.count({ where: { status: PostStatus.PENDING, deletedAt: null } }),
            this.prisma.report.count({ where: { status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW] } } }),
            this.prisma.partnerApplication.count({ where: { status: PartnerApplicationStatus.PENDING } }),
            this.prisma.program.count({
                where: { status: ProgramStatus.PUBLISHED, startAt: { lte: now }, endAt: { gt: now }, deletedAt: null },
            }),
            this.prisma.supportProgramRegistration.count({ where: { status: SupportProgramRegistrationStatus.WAITLISTED } }),
        ]);

        const result = {
            period: {
                from: from.toISOString(),
                to: to.toISOString(),
                activeUsers: activeUsersResult.length,
                newUsers,
                confirmedRegistrations: confirmedRegistrations.length,
            },
            current: {
                pendingPosts,
                openReports,
                pendingPartnerApps,
                ongoingPrograms,
                waitlistedRegs,
            }
        };

        await this.cacheManager.set(cacheKey, result, 300000);
        return result;
    }

    private calculateTimeRange(query: DashboardQueryDto, now: Date) {
        let from: Date;
        let to: Date;

        if (query.fromDate && query.toDate) {
            from = new Date(query.fromDate);
            to = new Date(query.toDate);
        } else {
            const days = query.days ?? 30;
            const startOfTodayUtc7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
            startOfTodayUtc7.setUTCHours(0, 0, 0, 0);

            from = new Date(startOfTodayUtc7.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
            from = new Date(from.getTime() - 7 * 60 * 60 * 1000);

            to = now;
        }

        return { from, to };
    }
}