import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { PostStatus, Prisma, RoleName, UserStatus } from "@prisma/client";
import { createHash, randomUUID } from "crypto";

import { PrismaService } from "../prisma/prisma.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { ReviewDecision, ReviewPostDto } from "./dto/review-post.dto";

@Injectable()
export class PostsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, dto: CreatePostDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
            throw new ForbiddenException("Tài khoản không hoạt động.");
        }

        const existing = await this.prisma.post.findFirst({
            where: {
                authorId: userId,
                revisions: { some: { contentHash: this.hashContent(dto.title, dto.body) } },
            },
        });
        if (existing) throw new ConflictException("Bài viết tương tự đã tồn tại.");

        const correlationId = randomUUID();

        return this.prisma.$transaction(async (transaction) => {
            const post = await transaction.post.create({
                data: {
                    authorId: userId,
                    status: PostStatus.DRAFT,
                },
            });

            const revision = await transaction.postRevision.create({
                data: {
                    postId: post.id,
                    revisionNumber: 1,
                    title: dto.title,
                    summary: dto.summary || null,
                    sanitizedBody: dto.body, // Giả sử đã sanitize
                    contentHash: this.hashContent(dto.title, dto.body),
                    createdById: userId,
                },
            });

            await transaction.post.update({
                where: { id: post.id },
                data: { currentRevisionId: revision.id },
            });

            await transaction.auditLog.create({
                data: {
                    actorType: "USER",
                    actorId: userId,
                    action: "CREATE_POST",
                    entityType: "POST",
                    entityId: post.id,
                    after: { status: PostStatus.DRAFT },
                    correlationId,
                },
            });

            return { ...post, currentRevision: revision };
        });
    }

    async submitForReview(userId: string, postId: string) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            include: { currentRevision: true },
        });
        if (!post) throw new NotFoundException("Không tìm thấy bài viết.");
        if (post.authorId !== userId) throw new ForbiddenException("Không phải chủ sở hữu.");
        if (post.status !== PostStatus.DRAFT && post.status !== PostStatus.REJECTED) {
            throw new BadRequestException("Chỉ có thể gửi duyệt từ DRAFT hoặc REJECTED.");
        }

        const correlationId = randomUUID();

        return this.prisma.$transaction(async (transaction) => {
            const updated = await transaction.post.update({
                where: { id: postId },
                data: { status: PostStatus.PENDING },
            });

            await transaction.auditLog.create({
                data: {
                    actorType: "USER",
                    actorId: userId,
                    action: "SUBMIT_POST",
                    entityType: "POST",
                    entityId: postId,
                    before: { status: post.status },
                    after: { status: PostStatus.PENDING },
                    correlationId,
                },
            });

            return updated;
        });
    }

    async review(adminId: string, postId: string, dto: ReviewPostDto) {
        const admin = await this.prisma.user.findUnique({
            where: { id: adminId },
            include: { role: true },
        });
        if (!admin || admin.role.name !== RoleName.ADMIN) {
            throw new ForbiddenException("Chỉ Admin được duyệt bài.");
        }

        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            include: { currentRevision: true },
        });
        if (!post) throw new NotFoundException("Không tìm thấy bài viết.");
        if (post.status !== PostStatus.PENDING) {
            throw new BadRequestException("Bài viết không ở trạng thái chờ duyệt.");
        }

        const now = new Date();
        const correlationId = randomUUID();
        const isApproved = dto.decision === ReviewDecision.APPROVE;

        if (!isApproved && (!dto.reason || dto.reason.length < 10)) {
            throw new BadRequestException("Lý do từ chối phải từ 10 ký tự.");
        }

        return this.prisma.$transaction(async (transaction) => {
            const updated = await transaction.post.update({
                where: { id: postId },
                data: {
                    status: isApproved ? PostStatus.PUBLISHED : PostStatus.REJECTED,
                    publishedAt: isApproved ? now : null,
                },
            });

            await transaction.moderationAction.create({
                data: {
                    actionType: isApproved ? "RESTORE" : "HIDE",
                    targetType: "POST",
                    targetId: postId,
                    targetRevisionId: post.currentRevisionId,
                    reason: isApproved ? "Phê duyệt bài viết" : dto.reason!,
                    createdById: adminId,
                },
            });

            await transaction.auditLog.create({
                data: {
                    actorType: "USER",
                    actorId: adminId,
                    action: isApproved ? "APPROVE_POST" : "REJECT_POST",
                    entityType: "POST",
                    entityId: postId,
                    before: { status: PostStatus.PENDING },
                    after: { status: updated.status },
                    reason: dto.reason,
                    correlationId,
                },
            });

            if (!isApproved) {
                await transaction.outboxEvent.create({
                    data: {
                        eventId: randomUUID(),
                        type: "POST_REJECTED",
                        aggregateType: "POST",
                        aggregateId: postId,
                        payload: {
                            recipientId: post.authorId,
                            postTitle: post.currentRevision?.title,
                            reason: dto.reason,
                        },
                    },
                });
            }

            return updated;
        });
    }

    private hashContent(title: string, body: string): string {
        return createHash("sha256").update(`${title}:${body}`).digest("hex");
    }
}