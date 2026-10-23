import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ContentStatus, RoleName, SearchDocumentType, UserStatus } from "@prisma/client";
import { createHash, randomUUID } from "crypto";
import { AuthenticatedUser } from "../auth/auth-user.interface";
import { PrismaService } from "../prisma/prisma.service";
import { CreateContentDto } from "./dto/create-content.dto";
import { PublishContentDto } from "./dto/publish-content.dto";

@Injectable()
export class ContentsService {
    constructor(private readonly prisma: PrismaService) { }

    async listPublic(type?: SearchDocumentType, page = 1, limit = 12) {
        const now = new Date();
        const where = {
            status: ContentStatus.PUBLISHED,
            deletedAt: null,
            publishedAt: { lte: now },
            ...(type ? { type } : {}),
        };

        const [items, total] = await Promise.all([
            this.prisma.content.findMany({
                where,
                orderBy: { publishedAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                select: { id: true, slug: true, title: true, summary: true, type: true, publishedAt: true },
            }),
            this.prisma.content.count({ where }),
        ]);

        return { items, total, page, limit };
    }

    async create(actor: AuthenticatedUser, dto: CreateContentDto) {
        await this.assertAdmin(actor.id);

        const existing = await this.prisma.content.findUnique({ where: { slug: dto.slug } });
        if (existing) throw new BadRequestException("Slug đã tồn tại.");

        return this.prisma.$transaction(async (transaction) => {
            const content = await transaction.content.create({
                data: {
                    slug: dto.slug,
                    type: dto.type,
                    title: dto.title,
                    summary: dto.summary,
                    status: ContentStatus.DRAFT,
                    sourceId: dto.sourceId,
                    reviewedById: dto.reviewedById,
                    reviewedAt: dto.reviewedAt ? new Date(dto.reviewedAt) : null,
                    nextReviewAt: dto.nextReviewAt ? new Date(dto.nextReviewAt) : null,
                },
            });

            const revision = await transaction.contentRevision.create({
                data: {
                    contentId: content.id,
                    revisionNumber: 1,
                    title: dto.title,
                    summary: dto.summary,
                    sanitizedBody: dto.sanitizedBody,
                    contentHash: this.hashContent(dto.title, dto.sanitizedBody),
                    createdById: actor.id,
                },
            });

            return transaction.content.update({
                where: { id: content.id },
                data: { currentRevisionId: revision.id },
            });
        });
    }

    async publish(actor: AuthenticatedUser, contentId: string, dto: PublishContentDto) {
        await this.assertAdmin(actor.id);

        const content = await this.prisma.content.findUnique({ where: { id: contentId } });
        if (!content) throw new NotFoundException("Không tìm thấy nội dung.");
        if (content.status !== ContentStatus.DRAFT && content.status !== ContentStatus.HIDDEN && content.status !== ContentStatus.SCHEDULED) {
            throw new BadRequestException("Không thể xuất bản ở trạng thái hiện tại.");
        }

        this.assertMedicalGuard(content);

        const now = new Date();
        const isScheduled = !!dto.publishAt && new Date(dto.publishAt) > now;

        if (isScheduled && new Date(dto.publishAt!) >= content.nextReviewAt!) {
            throw new BadRequestException("Thời gian xuất bản phải trước hạn rà soát y tế (nextReviewAt).");
        }

        return this.prisma.$transaction(async (transaction) => {
            const updated = await transaction.content.update({
                where: { id: contentId },
                data: {
                    status: isScheduled ? ContentStatus.SCHEDULED : ContentStatus.PUBLISHED,
                    publishAt: isScheduled ? new Date(dto.publishAt!) : null,
                    publishedAt: isScheduled ? null : now,
                    publishFailureReason: null,
                    version: { increment: 1 },
                },
            });

            await transaction.auditLog.create({
                data: {
                    actorType: "USER",
                    actorId: actor.id,
                    action: isScheduled ? "SCHEDULE_CONTENT" : "PUBLISH_CONTENT",
                    entityType: "CONTENT",
                    entityId: contentId,
                    after: { status: updated.status },
                    correlationId: randomUUID(),
                },
            });

            return updated;
        });
    }

    private assertMedicalGuard(content: any) {
        const now = new Date();
        if (!content.sourceId) throw new BadRequestException("Bắt buộc phải có Nguồn y tế (Source).");
        if (!content.reviewedById) throw new BadRequestException("Bắt buộc phải có Người rà soát.");
        if (!content.reviewedAt || !content.nextReviewAt) throw new BadRequestException("Thiếu mốc thời gian rà soát.");

        if (new Date(content.reviewedAt) > now) throw new BadRequestException("Ngày rà soát không được ở tương lai.");
        if (new Date(content.nextReviewAt) <= now) throw new BadRequestException("Nội dung đã hết hạn rà soát y tế.");
    }

    private async assertAdmin(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
        if (!user || user.status !== UserStatus.ACTIVE || user.role.name !== RoleName.ADMIN) {
            throw new ForbiddenException("Chỉ Admin mới có quyền quản lý CMS.");
        }
    }

    private hashContent(title: string, body: string) {
        return createHash("sha256").update(`${title}:${body}`).digest("hex");
    }
}