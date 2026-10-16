import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CommunityReactionType, RoleName, UserStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { CreateCommunityCommentDto } from "./dto/create-community-comment.dto";
import { ToggleCommunityReactionDto } from "./dto/toggle-community-reaction.dto";
import { UpdateCommunityCommentDto } from "./dto/update-community-comment.dto";

const COMMENT_LIMIT = 10;
const COMMENT_WINDOW_MS = 5 * 60 * 1000;

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
            deletedAt: null
          },
          include: {
            user: { select: { id: true, fullName: true } }
          },
          orderBy: { createdAt: "asc" },
          take: 6,
        });

        return {
          ...comment,
          replies: replies.slice(0, 5),
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
      deletedAt: null
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
      items,
      total,
      page,
      limit
    };
  }

  async createComment(userId: string, dto: CreateCommunityCommentDto) {
    return this.prisma.$transaction(async (transaction) => {
      await this.requireMember(transaction, userId);

      const idempotentComment = await transaction.communityComment.findUnique({
        where: {
          userId_idempotencyKey: {
            userId,
            idempotencyKey: dto.idempotencyKey.trim(),
          },
        },
      });
      if (idempotentComment) return idempotentComment;

      const recentCommentCount = await transaction.communityComment.count({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - COMMENT_WINDOW_MS) },
        },
      });
      if (recentCommentCount >= COMMENT_LIMIT) {
        throw new HttpException(
          "Bạn đang bình luận quá nhanh. Vui lòng thử lại sau.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const sourceKey = dto.sourceKey.trim();
      if (dto.parentId) {
        const parent = await transaction.communityComment.findUnique({
          where: { id: dto.parentId },
        });
        if (!parent || parent.deletedAt) {
          throw new NotFoundException("Bình luận gốc không còn tồn tại.");
        }
        if (parent.sourceKey !== sourceKey || parent.parentId) {
          throw new BadRequestException("Chỉ được trả lời một cấp trong cùng câu chuyện.");
        }
      }

      return transaction.communityComment.create({
        data: {
          userId,
          sourceKey,
          sourceTitle: dto.sourceTitle.trim(),
          sourcePath: dto.sourcePath.trim(),
          parentId: dto.parentId,
          content: dto.content.trim(),
          idempotencyKey: dto.idempotencyKey.trim(),
        },
      });
    });
  }

  async updateComment(userId: string, commentId: string, dto: UpdateCommunityCommentDto) {
    const comment = await this.prisma.communityComment.findUnique({ where: { id: commentId } });
    this.assertOwnership(comment, userId);
    return this.prisma.communityComment.update({
      where: { id: commentId },
      data: { content: dto.content.trim() },
    });
  }

  async softDeleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.communityComment.findUnique({ where: { id: commentId } });
    this.assertOwnership(comment, userId);
    return this.prisma.communityComment.update({
      where: { id: commentId },
      data: { content: "", deletedAt: new Date() },
    });
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
}
