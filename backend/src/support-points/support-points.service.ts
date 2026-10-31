import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PartnerStatus, RoleName, SupportPointStatus, UserStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { AuthenticatedUser } from "../auth/auth-user.interface";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSupportPointDto } from "./dto/create-support-point.dto";

@Injectable()
export class SupportPointsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(actor: AuthenticatedUser, dto: CreateSupportPointDto) {
        const user = await this.activePartner(actor);

        return this.prisma.$transaction(async (transaction) => {
            const point = await transaction.supportPoint.create({
                data: {
                    ownerPartnerId: user.partnerMembership!.id,
                    name: dto.name,
                    description: dto.description,
                    address: dto.address,
                    latitude: dto.latitude,
                    longitude: dto.longitude,
                    contactPhone: dto.contactPhone,
                    contactEmail: dto.contactEmail,
                    operatingHours: dto.operatingHours,
                    supportType: dto.supportType,
                    status: SupportPointStatus.DRAFT,
                },
            });

            await transaction.auditLog.create({
                data: {
                    actorType: "USER",
                    actorId: actor.id,
                    action: "CREATE_SUPPORT_POINT",
                    entityType: "SUPPORT_POINT",
                    entityId: point.id,
                    after: { status: SupportPointStatus.DRAFT },
                    correlationId: randomUUID(),
                },
            });

            return point;
        });
    }

    async submit(actor: AuthenticatedUser, pointId: string) {
        const user = await this.activePartner(actor);
        const point = await this.prisma.supportPoint.findUnique({ where: { id: pointId } });

        if (!point) throw new NotFoundException("Không tìm thấy điểm hỗ trợ.");
        if (point.ownerPartnerId !== user.partnerMembership!.id) throw new ForbiddenException("Không có quyền.");
        if (point.status !== SupportPointStatus.DRAFT && point.status !== SupportPointStatus.REJECTED) {
            throw new BadRequestException("Chỉ được gửi duyệt từ DRAFT hoặc REJECTED.");
        }

        return this.prisma.$transaction(async (transaction) => {
            return transaction.supportPoint.update({
                where: { id: pointId },
                data: { status: SupportPointStatus.PENDING, version: { increment: 1 } },
            });
        });
    }

    async review(actor: AuthenticatedUser, pointId: string, decision: "APPROVE" | "REJECT", reason?: string) {
        const admin = await this.prisma.user.findUnique({ where: { id: actor.id }, include: { role: true } });
        if (!admin || admin.role.name !== RoleName.ADMIN) throw new ForbiddenException("Chỉ Admin được duyệt.");

        const point = await this.prisma.supportPoint.findUnique({ where: { id: pointId } });
        if (!point) throw new NotFoundException("Không tìm thấy điểm hỗ trợ.");
        if (point.status !== SupportPointStatus.PENDING) throw new BadRequestException("Không ở trạng thái chờ duyệt.");

        const isApproved = decision === "APPROVE";

        return this.prisma.$transaction(async (transaction) => {
            return transaction.supportPoint.update({
                where: { id: pointId },
                data: {
                    status: isApproved ? SupportPointStatus.PUBLISHED : SupportPointStatus.REJECTED,
                    publishedAt: isApproved ? new Date() : null,
                    version: { increment: 1 },
                },
            });
        });
    }

    async listPublicMap(type?: string) {
        const where = {
            status: SupportPointStatus.PUBLISHED,
            deletedAt: null,
            ...(type ? { supportType: type } : {}),
        };

        const points = await this.prisma.supportPoint.findMany({
            where,
            select: {
                id: true,
                name: true,
                description: true,
                address: true,
                latitude: true,
                longitude: true,
                supportType: true,
            },
            orderBy: { publishedAt: "desc" },
        });

        return { items: points, total: points.length };
    }

    private async activePartner(actor: AuthenticatedUser) {
        const user = await this.prisma.user.findUnique({
            where: { id: actor.id },
            include: { role: true, partnerMembership: true },
        });
        if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
            throw new ForbiddenException("Tài khoản không hoạt động.");
        }
        if (!user.partnerMembership || user.partnerMembership.status !== PartnerStatus.ACTIVE) {
            throw new ForbiddenException("Chỉ Đối tác ACTIVE mới được tạo điểm hỗ trợ.");
        }
        return user;
    }
}