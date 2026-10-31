import {
  BadRequestException,
  ForbiddenException,
  HttpException,
} from "@nestjs/common";
import { CommunityReactionType, MemberPostStatus, NotificationKind, RoleName, UserStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CommunityEngagementService } from "./community-engagement.service";

const commentDto = {
  sourceKey: "story-hope-01",
  sourceTitle: "Ngày mình học cách hy vọng",
  sourcePath: "/goc-tam-ly#story-hope-01",
  content: "Cảm ơn bạn đã chia sẻ.",
  idempotencyKey: "request-0001",
};

describe("CommunityEngagementService", () => {
  const transaction = {
    user: { findUnique: jest.fn() },
    memberPost: { findUnique: jest.fn() },
    notification: { upsert: jest.fn() },
    communityComment: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    communityReaction: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof transaction) => unknown) => callback(transaction)),
    communityComment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    communityReaction: { groupBy: jest.fn(), findUnique: jest.fn() },
  } as unknown as PrismaService;
  const notificationCreate = jest.fn();
  const service = new CommunityEngagementService(prisma, { create: notificationCreate } as unknown as NotificationsService);

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.user.findUnique.mockResolvedValue({
      id: "user-1",
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PATIENT },
    });
    transaction.communityComment.findUnique.mockResolvedValue(null);
    transaction.communityComment.count.mockResolvedValue(0);
    transaction.memberPost.findUnique.mockResolvedValue(null);
    transaction.communityReaction.count.mockResolvedValue(1);
    transaction.communityComment.create.mockResolvedValue({ id: "comment-created" });
  });

  it("lists only root comments and nests replies to avoid duplicate rendering", async () => {
    const database = prisma as unknown as {
      communityComment: { findMany: jest.Mock };
    };
    database.communityComment.findMany.mockResolvedValue([]);

    await service.listComments(commentDto.sourceKey);
    expect(database.communityComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sourceKey: commentDto.sourceKey, parentId: null },
      }),
    );
  });

  it("returns the first comment when an idempotency key is retried", async () => {
    const existing = { id: "comment-1", ...commentDto };
    transaction.communityComment.findUnique.mockResolvedValue(existing);

    await expect(service.createComment("user-1", commentDto)).resolves.toBe(existing);
    expect(transaction.communityComment.create).not.toHaveBeenCalled();
  });

  it("limits excessive comments in a five-minute window", async () => {
    transaction.communityComment.count.mockResolvedValue(10);

    const error = service.createComment("user-1", commentDto);
    await expect(error).rejects.toBeInstanceOf(HttpException);
    await expect(error).rejects.toMatchObject({ status: 429 });
  });

  it("rejects a second-level reply", async () => {
    transaction.communityComment.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "reply-1",
        sourceKey: commentDto.sourceKey,
        parentId: "comment-1",
        deletedAt: null,
      });

    await expect(
      service.createComment("user-1", { ...commentDto, parentId: "reply-1" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("soft-deletes an owned comment instead of removing its thread", async () => {
    const database = prisma as unknown as {
      communityComment: { findUnique: jest.Mock; update: jest.Mock };
    };
    database.communityComment.findUnique.mockResolvedValue({
      id: "comment-1",
      userId: "user-1",
      deletedAt: null,
    });
    database.communityComment.update.mockResolvedValue({ id: "comment-1", deletedAt: new Date() });

    await service.softDeleteComment("user-1", "comment-1");
    expect(database.communityComment.update).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      data: { content: "", deletedAt: expect.any(Date) },
    });
  });

  it("prevents another member from editing a comment", async () => {
    const database = prisma as unknown as {
      communityComment: { findUnique: jest.Mock; update: jest.Mock };
    };
    database.communityComment.findUnique.mockResolvedValue({
      id: "comment-1",
      userId: "user-2",
      deletedAt: null,
    });

    await expect(
      service.updateComment("user-1", "comment-1", { content: "Nội dung mới" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("creates, changes, then removes the single reaction for a story", async () => {
    transaction.communityReaction.findUnique.mockResolvedValueOnce(null);
    transaction.communityReaction.create.mockResolvedValue({
      id: "reaction-1",
      type: CommunityReactionType.LIKE,
    });
    await service.toggleReaction("user-1", {
      sourceKey: commentDto.sourceKey,
      type: CommunityReactionType.LIKE,
    });

    transaction.communityReaction.findUnique.mockResolvedValueOnce({
      id: "reaction-1",
      type: CommunityReactionType.LIKE,
    });
    transaction.communityReaction.update.mockResolvedValue({
      id: "reaction-1",
      type: CommunityReactionType.LOVE,
    });
    await service.toggleReaction("user-1", {
      sourceKey: commentDto.sourceKey,
      type: CommunityReactionType.LOVE,
    });

    transaction.communityReaction.findUnique.mockResolvedValueOnce({
      id: "reaction-1",
      type: CommunityReactionType.LOVE,
    });
    await service.toggleReaction("user-1", {
      sourceKey: commentDto.sourceKey,
      type: CommunityReactionType.LOVE,
    });

    expect(transaction.communityReaction.create).toHaveBeenCalledTimes(1);
    expect(transaction.communityReaction.update).toHaveBeenCalledTimes(1);
    expect(transaction.communityReaction.delete).toHaveBeenCalledTimes(1);
  });

  it("returns zero counts for reactions that have not been used", async () => {
    const database = prisma as unknown as {
      communityReaction: { groupBy: jest.Mock };
    };
    database.communityReaction.groupBy.mockResolvedValue([
      { type: CommunityReactionType.SUPPORT, _count: { _all: 3 } },
    ]);

    await expect(service.reactionSummary(commentDto.sourceKey)).resolves.toEqual({
      LIKE: 0,
      LOVE: 0,
      SUPPORT: 3,
    });
  });

  it("notifies the author only after a comment is saved on a published member story", async () => {
    transaction.memberPost.findUnique.mockResolvedValue({
      id: commentDto.sourceKey, userId: "AUTHOR-1", title: "Ngày mình học cách hy vọng",
      status: MemberPostStatus.PUBLISHED,
    });
    await service.createComment("user-1", commentDto);
    expect(notificationCreate).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: "AUTHOR-1", kind: NotificationKind.STORY_COMMENT,
    }), transaction);
  });

  it("does not notify someone about their own comment", async () => {
    transaction.memberPost.findUnique.mockResolvedValue({
      id: commentDto.sourceKey, userId: "user-1", title: "Ngày mình học cách hy vọng",
      status: MemberPostStatus.PUBLISHED,
    });
    await service.createComment("user-1", commentDto);
    expect(notificationCreate).not.toHaveBeenCalled();
  });

  it("rejects interaction with a member story that is still pending", async () => {
    transaction.memberPost.findUnique.mockResolvedValue({
      id: "POST-1234567890123-abcdef", userId: "AUTHOR-1",
      status: MemberPostStatus.PENDING,
    });
    await expect(service.createComment("user-1", {
      ...commentDto, sourceKey: "POST-1234567890123-abcdef",
    })).rejects.toThrow("Câu chuyện chưa được công khai.");
    expect(notificationCreate).not.toHaveBeenCalled();
  });

  it("groups reactions to a published member story in an hourly notification", async () => {
    transaction.memberPost.findUnique.mockResolvedValue({
      id: commentDto.sourceKey, userId: "AUTHOR-1", title: "Ngày mình học cách hy vọng",
      status: MemberPostStatus.PUBLISHED,
    });
    transaction.communityReaction.findUnique.mockResolvedValue(null);
    transaction.communityReaction.create.mockResolvedValue({ type: CommunityReactionType.LOVE });
    transaction.communityReaction.count.mockResolvedValue(3);
    await service.toggleReaction("user-1", { sourceKey: commentDto.sourceKey, type: CommunityReactionType.LOVE });
    expect(transaction.notification.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ recipientId: "AUTHOR-1", kind: NotificationKind.STORY_REACTION }),
    }));
  });

  it("respects an author's disabled comment notifications", async () => {
    transaction.memberPost.findUnique.mockResolvedValue({
      id: commentDto.sourceKey, userId: "AUTHOR-1", title: "Câu chuyện",
      status: MemberPostStatus.PUBLISHED,
    });
    transaction.user.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
      where.id === "AUTHOR-1" ? { notifyStoryComments: false } : {
        id: "user-1", status: UserStatus.ACTIVE, deletedAt: null, role: { name: RoleName.PATIENT },
      });
    await service.createComment("user-1", commentDto);
    expect(notificationCreate).not.toHaveBeenCalled();
    expect(transaction.communityComment.create).toHaveBeenCalled();
  });

  it("imports a legacy reaction without toggling it off or notifying the author", async () => {
    transaction.memberPost.findUnique.mockResolvedValue({
      id: commentDto.sourceKey, userId: "AUTHOR-1", status: MemberPostStatus.PUBLISHED,
    });
    transaction.communityReaction.upsert.mockResolvedValue({ type: CommunityReactionType.LOVE });
    await expect(service.importReaction("user-1", {
      sourceKey: commentDto.sourceKey, type: CommunityReactionType.LOVE,
    })).resolves.toEqual({ type: CommunityReactionType.LOVE });
    expect(transaction.communityReaction.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {} }));
    expect(transaction.notification.upsert).not.toHaveBeenCalled();
  });

  it("does not send a new alert when importing an old comment", async () => {
    transaction.memberPost.findUnique.mockResolvedValue({
      id: commentDto.sourceKey, userId: "AUTHOR-1", title: "Câu chuyện",
      status: MemberPostStatus.PUBLISHED,
    });
    await service.createComment("user-1", { ...commentDto, idempotencyKey: "legacy:COMMENT-123456" });
    expect(transaction.communityComment.create).toHaveBeenCalled();
    expect(notificationCreate).not.toHaveBeenCalled();
  });
});
