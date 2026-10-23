import { ForbiddenException, Injectable } from "@nestjs/common";
import { RoleName, UserStatus } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth-user.interface";
import { PrismaService } from "../prisma/prisma.service";
import { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";

@Injectable()
export class AuditLogsService {
    constructor(private readonly prisma: PrismaService) { }

    async list(actor: AuthenticatedUser, query: ListAuditLogsQueryDto) {
        const admin = await this.prisma.user.findUnique({
            where: { id: actor.id },
            include: { role: true },
        });

        if (!admin || admin.deletedAt || admin.status !== UserStatus.ACTIVE || admin.role.name !== RoleName.ADMIN) {
            throw new ForbiddenException("Chỉ Admin mới được xem Nhật ký vận hành.");
        }

        const { page, limit, actorType, entityType, entityId, action, correlationId, fromDate, toDate } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (actorType) where.actorType = actorType;
        if (entityType) where.entityType = entityType;
        if (entityId) where.entityId = entityId;
        if (action) where.action = action;
        if (correlationId) where.correlationId = correlationId;

        if (fromDate || toDate) {
            where.occurredAt = {};
            if (fromDate) where.occurredAt.gte = new Date(fromDate);
            if (toDate) where.occurredAt.lte = new Date(toDate);
        }

        const [items, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { occurredAt: "desc" },
                skip,
                take: limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
}