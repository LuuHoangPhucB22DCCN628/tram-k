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
            items: items.map(item => ({
                ...item,
                before: this.redact(item.before),
                after: this.redact(item.after),
            })),
            total, page, limit, totalPages: Math.ceil(total / limit),
        };
    }

    private redact(data: any): any {
        if (data === null || data === undefined) return data;
        if (typeof data === "string") {
            return data
                .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]")
                .replace(/(0|\+84)[0-9]{9,10}/g, "[PHONE_REDACTED]");
        }
        if (!data || typeof data !== "object") return data;
        const sensitiveKeys = ["password", "passwordHash", "token", "tokenHash", "secret", "email", "phone", "displayName", "city", "birthYear", "bio"];
        const redacted = Array.isArray(data) ? [...data] : { ...data };

        for (const key of Object.keys(redacted)) {
            if (sensitiveKeys.includes(key)) {
                redacted[key] = "[REDACTED]";
            } else if (typeof redacted[key] === "object") {
                redacted[key] = this.redact(redacted[key]);
            } else if (typeof redacted[key] === "string") {
                // Đệ quy để áp dụng Regex cho các chuỗi con
                redacted[key] = this.redact(redacted[key]);
            }
        }
        return redacted;
    }
}