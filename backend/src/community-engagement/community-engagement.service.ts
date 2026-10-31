import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CommunityReactionType,
  MemberPostStatus,
  NotificationKind,
  RoleName,
  UserStatus,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateCommunityCommentDto } from "./dto/create-community-comment.dto";
import { ToggleCommunityReactionDto } from "./dto/toggle-community-reaction.dto";
import { UpdateCommunityCommentDto } from "./dto/update-community-comment.dto";

const COMMENT_LIMIT = 10;
const COMMENT_WINDOW_MS = 5 * 60 * 1000;

@Injectable()
export class CommunityEngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listComments(sourceKey: string) {
    return this.prisma.communityComment.findMany({
      where: { sourceKey, parentId: null },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profile: { select: { visibility: true } },
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profile: { select: { visibility: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async listMineComments(userId: string) {
    return this.prisma.communityComment.findMany({
      where: { userId, deletedAt: null },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async listAdminComments(adminId: string) {
    await this.requireAdmin(adminId);
    return this.prisma.communityComment.findMany({
      where: { deletedAt: null },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async moderateRemoveComment(adminId: string, commentId: string) {
    await this.requireAdmin(adminId);
    const comment = await this.prisma.communityComment.findUnique({
      where: { id: commentId },
    });
    if (!comment || comment.deletedAt)
      throw new NotFoundException("Không tìm thấy bình luận.");
    return this.prisma.communityComment.update({
      where: { id: commentId },
      data: { content: "", deletedAt: new Date() },
    });
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
      const post = await transaction.memberPost.findUnique({
        where: { id: sourceKey },
      });
      if (
        (!post && sourceKey.startsWith("POST-")) ||
        (post && post.status !== MemberPostStatus.PUBLISHED)
      ) {
        throw new NotFoundException("Câu chuyện chưa được công khai.");
      }
      let parentUserId: string | null = null;
      if (dto.parentId) {
        const parent = await transaction.communityComment.findUnique({
          where: { id: dto.parentId },
        });
        if (!parent || parent.deletedAt) {
          throw new NotFoundException("Bình luận gốc không còn tồn tại.");
        }
        if (parent.sourceKey !== sourceKey || parent.parentId) {
          throw new BadRequestException(
            "Chỉ được trả lời một cấp trong cùng câu chuyện.",
          );
        }
        parentUserId = parent.userId;
      }

      const comment = await transaction.communityComment.create({
        data: {
          userId,
          sourceKey,
          sourceTitle: post?.title ?? dto.sourceTitle.trim(),
          sourcePath: post ? this.storyPath(post.id) : dto.sourcePath.trim(),
          parentId: dto.parentId,
          content: dto.content.trim(),
          idempotencyKey: dto.idempotencyKey.trim(),
        },
      });
      const recipientId = parentUserId ?? post?.userId;
      const recipient =
        post && recipientId && recipientId !== userId
          ? await transaction.user.findUnique({
              where: { id: recipientId },
              select: {
                notifyStoryComments: true,
                notifyStoryReplies: true,
              },
            })
          : null;
      if (
        post &&
        recipientId &&
        recipientId !== userId &&
        !dto.idempotencyKey.startsWith("legacy:") &&
        (parentUserId
          ? recipient?.notifyStoryReplies !== false
          : recipient?.notifyStoryComments !== false)
      ) {
        const actor = await transaction.user.findUnique({
          where: { id: userId },
          select: { fullName: true },
        });
        await this.notifications.create(
          {
            recipientId,
            kind: parentUserId
              ? NotificationKind.STORY_REPLY
              : NotificationKind.STORY_COMMENT,
            title: parentUserId
              ? "Có người trả lời bình luận của bạn"
              : "Có bình luận mới về câu chuyện của bạn",
            message: parentUserId
              ? `${actor?.fullName ?? "Một thành viên"} đã trả lời bình luận của bạn trong “${post.title}”.`
              : `${actor?.fullName ?? "Một thành viên"} đã bình luận về “${post.title}”.`,
            link: `/goc-tam-ly?story=${encodeURIComponent(post.id)}&comment=${encodeURIComponent(comment.id)}#cau-chuyen-${encodeURIComponent(post.id)}`,
            dedupeKey: `story-comment:${comment.id}:${recipientId}`,
          },
          transaction,
        );
      }
      return comment;
    });
  }

  async updateComment(
    userId: string,
    commentId: string,
    dto: UpdateCommunityCommentDto,
  ) {
    const comment = await this.prisma.communityComment.findUnique({
      where: { id: commentId },
    });
    this.assertOwnership(comment, userId);
    return this.prisma.communityComment.update({
      where: { id: commentId },
      data: { content: dto.content.trim() },
    });
  }

  async softDeleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.communityComment.findUnique({
      where: { id: commentId },
    });
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
      const post = await transaction.memberPost.findUnique({
        where: { id: sourceKey },
      });
      if (
        (!post && sourceKey.startsWith("POST-")) ||
        (post && post.status !== MemberPostStatus.PUBLISHED)
      ) {
        throw new NotFoundException("Câu chuyện chưa được công khai.");
      }
      const current = await transaction.communityReaction.findUnique({
        where: { userId_sourceKey: { userId, sourceKey } },
      });
      if (current?.type === dto.type) {
        await transaction.communityReaction.delete({
          where: { id: current.id },
        });
        return null;
      }
      if (current) {
        return transaction.communityReaction.update({
          where: { id: current.id },
          data: { type: dto.type },
        });
      }
      const reaction = await transaction.communityReaction.create({
        data: { userId, sourceKey, type: dto.type },
      });
      const owner =
        post && post.userId !== userId
          ? await transaction.user.findUnique({
              where: { id: post.userId },
              select: { notifyStoryReactions: true },
            })
          : null;
      if (
        post &&
        post.userId !== userId &&
        owner?.notifyStoryReactions !== false
      ) {
        const actor = await transaction.user.findUnique({
          where: { id: userId },
          select: { fullName: true },
        });
        const bucket = new Date();
        bucket.setMinutes(0, 0, 0);
        const count = await transaction.communityReaction.count({
          where: { sourceKey },
        });
        await transaction.notification.upsert({
          where: {
            recipientId_dedupeKey: {
              recipientId: post.userId,
              dedupeKey: `story-reaction:${post.id}:${bucket.toISOString()}`,
            },
          },
          create: {
            recipientId: post.userId,
            kind: NotificationKind.STORY_REACTION,
            title: "Câu chuyện của bạn nhận được sự đồng cảm",
            message: `${actor?.fullName ?? "Một thành viên"}${count > 1 ? ` và ${count - 1} người khác` : ""} đã bày tỏ cảm xúc với “${post.title}”.`,
            link: this.storyPath(post.id),
            dedupeKey: `story-reaction:${post.id}:${bucket.toISOString()}`,
          },
          update: {
            message: `${actor?.fullName ?? "Một thành viên"}${count > 1 ? ` và ${count - 1} người khác` : ""} đã bày tỏ cảm xúc với “${post.title}”.`,
            readAt: null,
            createdAt: new Date(),
          },
        });
      }
      return reaction;
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

  async importReaction(userId: string, dto: ToggleCommunityReactionDto) {
    return this.prisma.$transaction(async (transaction) => {
      await this.requireMember(transaction, userId);
      const sourceKey = dto.sourceKey.trim();
      const post = await transaction.memberPost.findUnique({
        where: { id: sourceKey },
      });
      if (!post || post.status !== MemberPostStatus.PUBLISHED) {
        throw new NotFoundException(
          "Chỉ có thể đồng bộ cảm xúc cho câu chuyện đã công khai.",
        );
      }
      return transaction.communityReaction.upsert({
        where: { userId_sourceKey: { userId, sourceKey } },
        create: { userId, sourceKey, type: dto.type },
        update: {},
      });
    });
  }

  async myReaction(userId: string, sourceKey: string) {
    const reaction = await this.prisma.communityReaction.findUnique({
      where: { userId_sourceKey: { userId, sourceKey } },
      select: { type: true },
    });
    return { type: reaction?.type ?? null };
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
      throw new ForbiddenException(
        "Chỉ thành viên đang hoạt động được thực hiện thao tác này.",
      );
    }
  }

  private async requireAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (
      !user ||
      user.deletedAt ||
      user.status !== UserStatus.ACTIVE ||
      user.role.name !== RoleName.ADMIN
    ) {
      throw new ForbiddenException("Chỉ quản trị viên được quản lý bình luận.");
    }
  }

  private storyPath(postId: string): string {
    return `/goc-tam-ly?story=${encodeURIComponent(postId)}#cau-chuyen-${encodeURIComponent(postId)}`;
  }

  private assertOwnership(
    comment: { userId: string; deletedAt: Date | null } | null,
    userId: string,
  ): asserts comment is { userId: string; deletedAt: null } {
    if (!comment || comment.deletedAt)
      throw new NotFoundException("Không tìm thấy bình luận.");
    if (comment.userId !== userId) {
      throw new ForbiddenException(
        "Bạn chỉ có thể sửa hoặc xóa bình luận của mình.",
      );
    }
  }
}
