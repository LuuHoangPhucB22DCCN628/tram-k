import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CommunityReactionType, RoleName, UserStatus } from "@prisma/client";
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';

import { PrismaService } from "../prisma/prisma.service";
import { CreateCommunityCommentDto } from "./dto/create-community-comment.dto";
import { ToggleCommunityReactionDto } from "./dto/toggle-community-reaction.dto";
import { UpdateCommunityCommentDto } from "./dto/update-community-comment.dto";
import { AuthenticatedUser } from "../auth/auth-user.interface";

@Injectable()
export class CommunityEngagementService {
  constructor(private readonly prisma: PrismaService) { }

  async listComments(sourceKey: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.communityComment.findMany({
        where: { sourceKey, parentId: null },
        include: {
          user: { select: { id: true, fullName: true } }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      this.prisma.communityComment.count({
        where: { sourceKey, parentId: null }
      })
    ]);

    const itemsWithReplies = await Promise.all(
      items.map(async (comment) => {
        const replies = await this.prisma.communityComment.findMany({
          where: {
            sourceKey,
            parentId: comment.id,
          },
          include: {
            user: { select: { id: true, fullName: true } }
          },
          orderBy: { createdAt: "asc" },
          take: 6,
        });

        return {
          ...this.mapComment(comment),
          replies: replies.slice(0, 5).map(r => this.mapComment(r)),
          hasMoreReplies: replies.length > 5,
        };
      })
    );

    return {
      items: itemsWithReplies,
      total,
      page,
      limit
    }
  }

  private mapComment(comment: any) {
    const isHidden = comment.deletedAt !== null || comment.status === "HIDDEN";

    return {
      id: comment.id,
      content: isHidden ? "[Bình luận đã bị ẩn hoặc xóa]" : comment.content,
      createdAt: comment.createdAt,
      user: isHidden ? null : comment.user,
      status: isHidden ? "HIDDEN" : comment.status,
    };
  }

  async listReplies(
    sourceKey: string,
    commentId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const rootComment = await this.prisma.communityComment.findUnique({
      where: { id: commentId }
    });

    if (
      !rootComment ||
      rootComment.deletedAt ||
      rootComment.sourceKey !== sourceKey ||
      rootComment.parentId !== null
    ) {
      throw new NotFoundException("Không tìm thấy bình luận gốc.");
    }

    const where = {
      sourceKey,
      parentId: commentId,
    };
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.communityComment.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit
      }),
      this.prisma.communityComment.count({ where })
    ]);

    return {
      items: items.map(item => this.mapComment(item)),
      total,
      page,
      limit
    };
  }

  async createComment(actor: AuthenticatedUser, dto: CreateCommunityCommentDto) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
    if (!user || user.status !== "ACTIVE" || user.deletedAt) {
      throw new ForbiddenException("Tài khoản không hoạt động.");
    }

    const existing = await this.prisma.communityComment.findUnique({
      where: {
        userId_idempotencyKey: { userId: actor.id, idempotencyKey: dto.idempotencyKey }
      }
    });

    if (existing) {
      const newHash = this.getHashPayload(dto);
      const oldHash = this.getHashPayload(existing as any);

      if (newHash != oldHash) {
        throw new ConflictException("Idempotency-Key đã được sử dụng với nội dung khác.");
      }
      return this.mapComment(existing);
    }

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const countLastMin = await this.prisma.communityComment.count({
      where: { userId: actor.id, createdAt: { gte: oneMinuteAgo } }
    });
    const countLastHour = await this.prisma.communityComment.count({
      where: { userId: actor.id, createdAt: { gte: oneHourAgo } }
    });

    if (countLastMin >= 5 || countLastHour >= 30) {
      throw new HttpException("Bạn đã bình luận quá nhiều. Vui lòng thử lại sau.", HttpStatus.TOO_MANY_REQUESTS);
    }

    let parentComment: any = null;
    if (dto.parentId) {
      parentComment = await this.prisma.communityComment.findUnique({
        where: { id: dto.parentId },
        include: { user: { select: { id: true, fullName: true } } }
      });

      if (!parentComment || parentComment.deletedAt !== null || parentComment.status !== "PUBLISHED") {
        throw new NotFoundException("Bình luận gốc không tồn tại hoặc đã bị ẩn/xóa.");
      }

      if (parentComment.sourceKey !== dto.sourceKey) {
        throw new BadRequestException("Bình luận gốc phải thuộc cùng một bài viết.");
      }

      if (parentComment.parentId !== null) {
        throw new BadRequestException("Chỉ hỗ trợ trả lời bình luận cấp 1.");
      }
    }

    const correlationId = randomUUID();

    const comment = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.communityComment.create({
        data: {
          userId: actor.id,
          sourceKey: dto.sourceKey,
          sourceTitle: dto.sourceTitle,
          sourcePath: dto.sourcePath,
          parentId: dto.parentId,
          content: dto.content,
          idempotencyKey: dto.idempotencyKey,
          status: "PUBLISHED",
        }
      });

      await transaction.auditLog.create({
        data: {
          actorType: "USER",
          actorId: actor.id,
          action: "CREATE_COMMENT",
          entityType: "COMMUNITY_COMMENT",
          entityId: created.id,
          after: { content: created.content, sourceKey: created.sourceKey },
          correlationId,
        }
      });

      if (parentComment && parentComment.userId !== actor.id) {
        await transaction.outboxEvent.create({
          data: {
            eventId: randomUUID(),
            type: "COMMENT_REPLIED",
            aggregateType: "COMMUNITY_COMMENT",
            aggregateId: created.id,
            payload: {
              recipientId: parentComment.userId,
              replierName: user.fullName,
              commentId: created.id,
              parentId: parentComment.id,
              sourceKey: dto.sourceKey,
              sourceTitle: dto.sourceTitle,
              contentPreview: dto.content.substring(0, 100),
            }
          }
        })
      }

      return created;
    });

    return this.mapComment(comment);
  }

  async updateComment(userId: string, commentId: string, dto: UpdateCommunityCommentDto) {
    const comment = await this.prisma.communityComment.findUnique({ where: { id: commentId } });
    this.assertOwnership(comment, userId);

    if (comment.status !== "PUBLISHED" || comment.deletedAt !== null) {
      throw new BadRequestException("Không thể sửa bình luận đã bị ẩn hoặc xóa.");
    }


    const correlationId = randomUUID();

    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.communityComment.update({
        where: { id: commentId },
        data: {
          content: dto.content,
          version: { increment: 1 },
          contentVersion: { increment: 1 },
        },
      });

      await transaction.auditLog.create({
        data: {
          actorType: "USER",
          actorId: userId,
          action: "UPDATE_COMMENT",
          entityType: "COMMUNITY_COMMENT",
          entityId: commentId,
          before: { content: comment.content },
          after: { content: result.content },
          correlationId,
        }
      });

      return result;
    });

    return this.mapComment(updated);
  }

  async softDeleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.communityComment.findUnique({ where: { id: commentId } });
    this.assertOwnership(comment, userId);

    const correlationId = randomUUID();

    const deleted = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.communityComment.update({
        where: { id: commentId },
        data: {
          content: "",
          deletedAt: new Date(),
          deletedById: userId,
          version: { increment: 1 },
        },
      });

      await transaction.auditLog.create({
        data: {
          actorType: "USER",
          actorId: userId,
          action: "SOFT_DELETE_COMMENT",
          entityType: "COMMUNITY_COMMENT",
          entityId: commentId,
          after: { deletedAt: result.deletedAt },
          correlationId,
        }
      });

      return result;
    });

    return this.mapComment(deleted);
  }

  async toggleReaction(userId: string, dto: ToggleCommunityReactionDto) {
    return this.prisma.$transaction(async (transaction) => {
      await this.requireMember(transaction, userId);
      const sourceKey = dto.sourceKey.trim();
      const current = await transaction.communityReaction.findUnique({
        where: { userId_sourceKey: { userId, sourceKey } },
      });
      if (current?.type === dto.type) {
        await transaction.communityReaction.delete({ where: { id: current.id } });
        return null;
      }
      if (current) {
        return transaction.communityReaction.update({
          where: { id: current.id },
          data: { type: dto.type },
        });
      }
      return transaction.communityReaction.create({
        data: { userId, sourceKey, type: dto.type },
      });
    });
  }

  async reactionSummary(sourceKey: string) {
    const groups = await this.prisma.communityReaction.groupBy({
      by: ["type"],
      where: { sourceKey },
      _count: { _all: true },
    });
    const summary: Record<CommunityReactionType, number> = {
      LIKE: 0,
      LOVE: 0,
      SUPPORT: 0,
    };
    for (const group of groups) summary[group.type] = group._count._all;
    return summary;
  }

  private async requireMember(
    transaction: Pick<PrismaService, "user">,
    userId: string,
  ) {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (
      !user ||
      user.deletedAt ||
      user.status !== UserStatus.ACTIVE ||
      user.role.name === RoleName.ADMIN
    ) {
      throw new ForbiddenException("Chỉ thành viên đang hoạt động được thực hiện thao tác này.");
    }
  }

  private assertOwnership(
    comment: { userId: string; deletedAt: Date | null } | null,
    userId: string,
  ): asserts comment is { userId: string; deletedAt: null } {
    if (!comment || comment.deletedAt) throw new NotFoundException("Không tìm thấy bình luận.");
    if (comment.userId !== userId) {
      throw new ForbiddenException("Bạn chỉ có thể sửa hoặc xóa bình luận của mình.");
    }
  }

  private getHashPayload(data: { sourceKey: string, sourceTitle: string, sourcePath: string, parentId?: string | null, content: string }) {
    return crypto.createHash("md5").update(JSON.stringify({
      sourceKey: data.sourceKey,
      sourceTitle: data.sourceTitle,
      sourcePath: data.sourcePath,
      parentId: data.parentId || null,
      content: data.content,
    })).digest("hex");
  }
}
