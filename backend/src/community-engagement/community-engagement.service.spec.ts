import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
} from "@nestjs/common";
import { CommunityReactionType, RoleName, UserStatus } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth-user.interface";

import { PrismaService } from "../prisma/prisma.service";
import { CommunityEngagementService } from "./community-engagement.service";

const commentDto = {
  sourceKey: "story-hope-01",
  sourceTitle: "Ngày mình học cách hy vọng",
  sourcePath: "/goc-tam-ly#story-hope-01",
  content: "Cảm ơn bạn đã chia sẻ.",
  idempotencyKey: "request-0001",
};
const actor: AuthenticatedUser = {
  id: "user-1",
  role: RoleName.PATIENT,
  authVersion: 1,
};

describe("CommunityEngagementService", () => {
  const transaction = {
    user: { findUnique: jest.fn() },
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
    },
  };
  const prisma = {
    $transaction: jest.fn((arg: unknown) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return (arg as (client: typeof prisma) => unknown)(prisma);
    }),
    user: { findUnique: jest.fn() },
    communityComment: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    communityReaction: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    outboxEvent: { create: jest.fn() },
  } as unknown as PrismaService;

  const communityCommentMock = (
    prisma as unknown as {
      communityComment: {
        count: jest.Mock;
        create: jest.Mock;
        findUnique: jest.Mock;
      };
    }
  ).communityComment;
  const service = new CommunityEngagementService(prisma);

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
    (prisma as unknown as { user: { findUnique: jest.Mock } }).user.findUnique.mockResolvedValue({
      id: actor.id,
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PATIENT },
    });
    communityCommentMock.findUnique.mockResolvedValue(null);
    communityCommentMock.count.mockResolvedValue(0);
    communityCommentMock.create.mockResolvedValue({
      id: "comment-new",
      userId: actor.id,
      content: commentDto.content,
      deletedAt: null,
      status: "PUBLISHED",
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    communityCommentMock.findUnique.mockReset();
    communityCommentMock.count.mockReset();
    communityCommentMock.create.mockReset();
  });

  it("paginates root comments and returns pagination metadata", async () => {
    const database = prisma as unknown as {
      communityComment: {
        findMany: jest.Mock;
        count: jest.Mock;
      };
    };

    const createdAt = new Date("2026-10-20T00:00:00.000Z");
    const items = [{
      id: "comment-21",
      content: "Bình luận công khai.",
      createdAt,
      deletedAt: null,
      status: "PUBLISHED",
      user: { id: "user-1", fullName: "Thành viên" },
    }];

    database.communityComment.findMany
      .mockResolvedValueOnce(items as any)
      .mockResolvedValueOnce([] as any);

    database.communityComment.count.mockResolvedValue(45);

    await expect(
      service.listComments(commentDto.sourceKey, 2, 20),
    ).resolves.toEqual({
      items: [
        {
          id: items[0].id,
          content: items[0].content,
          createdAt,
          user: items[0].user,
          status: items[0].status,
          replies: [],
          hasMoreReplies: false,
        },
      ],
      total: 45,
      page: 2,
      limit: 20,
    });

    expect(database.communityComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sourceKey: commentDto.sourceKey,
          parentId: null,
        },
        orderBy: { createdAt: "desc" },
        skip: 20,
        take: 20,
      }),
    );

    expect(database.communityComment.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          sourceKey: commentDto.sourceKey,
          parentId: "comment-21",
        },
        orderBy: { createdAt: "asc" },
        take: 6,
      }),
    );
  });
  it("enforces the five-comments-per-minute limit", async () => {
    const now = new Date("2026-10-22T00:00:00.000Z");
    jest.useFakeTimers().setSystemTime(now);
    communityCommentMock.count.mockResolvedValueOnce(5);

    await expect(
      service.createComment(actor, commentDto),
    ).rejects.toMatchObject({ status: 429 });
    expect(communityCommentMock.count).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        createdAt: { gte: new Date(now.getTime() - 60_000) },
      },
    });
  });

  it("enforces the thirty-comments-per-hour limit independently of the minute limit", async () => {
    const now = new Date("2026-10-22T00:00:00.000Z");
    jest.useFakeTimers().setSystemTime(now);
    communityCommentMock.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(30);

    await expect(
      service.createComment(actor, commentDto),
    ).rejects.toMatchObject({ status: 429 });
    expect(communityCommentMock.count).toHaveBeenNthCalledWith(1, {
      where: {
        userId: "user-1",
        createdAt: { gte: new Date(now.getTime() - 60_000) },
      },
    });
    expect(communityCommentMock.count).toHaveBeenNthCalledWith(2, {
      where: {
        userId: "user-1",
        createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
      },
    });
  });

  it("rejects reusing an idempotency key with a different comment payload", async () => {
    communityCommentMock.findUnique.mockResolvedValue({
      id: "comment-existing",
      userId: "user-1",
      idempotencyKey: commentDto.idempotencyKey,
      content: "Nội dung ban đầu.",
      sourceKey: commentDto.sourceKey,
    });

    await expect(
      service.createComment(actor, {
        ...commentDto,
        content: "Nội dung khác.",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(communityCommentMock.create).not.toHaveBeenCalled();
  });

  it("replays the existing comment when the idempotency key and payload match", async () => {
    const existing = {
      id: "comment-existing",
      userId: actor.id,
      ...commentDto,
      parentId: null,
      deletedAt: null,
      status: "PUBLISHED",
      createdAt: new Date("2026-10-20T00:00:00.000Z"),
      user: { id: actor.id, fullName: "Thành viên" },
    };
    communityCommentMock.findUnique.mockResolvedValue(existing);

    await expect(service.createComment(actor, commentDto)).resolves.toEqual({
      id: existing.id,
      content: existing.content,
      createdAt: existing.createdAt,
      user: existing.user,
      status: existing.status,
    });
    expect(communityCommentMock.create).not.toHaveBeenCalled();
    expect(communityCommentMock.count).not.toHaveBeenCalled();
  });

  it("does not expose deleted comment content or author in the public thread", async () => {
    const database = prisma as unknown as {
      communityComment: {
        findMany: jest.Mock;
        count: jest.Mock;
      };
    };
    const deletedComment = {
      id: "comment-deleted",
      userId: "user-private",
      content: "Nội dung riêng tư đã xóa.",
      deletedAt: new Date("2026-10-20T00:00:00.000Z"),
      parentId: null,
      user: { id: "user-private", fullName: "Tên người đã xóa" },
    };
    database.communityComment.findMany
      .mockResolvedValueOnce([deletedComment])
      .mockResolvedValueOnce([{ id: "reply-visible", content: "Một phản hồi." }]);
    database.communityComment.count.mockResolvedValue(1);

    const result = await service.listComments(commentDto.sourceKey, 1, 20);

    expect(JSON.stringify(result)).not.toContain("Nội dung riêng tư đã xóa.");
    expect(JSON.stringify(result)).not.toContain("Tên người đã xóa");
  });

  it("rejects a second-level reply", async () => {
    communityCommentMock.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "reply-1",
        sourceKey: commentDto.sourceKey,
        parentId: "comment-1",
        deletedAt: null,
        status: "PUBLISHED",
      });

    await expect(
      service.createComment(actor, { ...commentDto, parentId: "reply-1" }),
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
      data: {
        content: "",
        deletedAt: expect.any(Date),
        deletedById: "user-1",
        version: { increment: 1 },
      },
    });
  });

  it("updates an owned published comment and writes audit in the same transaction", async () => {
    const database = prisma as unknown as {
      communityComment: { findUnique: jest.Mock; update: jest.Mock };
      auditLog: { create: jest.Mock };
    };
    database.communityComment.findUnique.mockResolvedValue({
      id: "comment-1",
      userId: "user-1",
      content: "Nội dung cũ",
      status: "PUBLISHED",
      deletedAt: null,
      createdAt: new Date("2026-10-20T00:00:00.000Z"),
      user: { id: "user-1" },
    });
    database.communityComment.update.mockResolvedValue({
      id: "comment-1",
      userId: "user-1",
      content: "Nội dung mới",
      status: "PUBLISHED",
      deletedAt: null,
      createdAt: new Date("2026-10-20T00:00:00.000Z"),
      user: { id: "user-1" },
    });

    const result = await service.updateComment("user-1", "comment-1", {
      content: "Nội dung mới",
    });

    expect(result.content).toBe("Nội dung mới");
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(database.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATE_COMMENT",
        entityType: "COMMUNITY_COMMENT",
        before: { content: "Nội dung cũ" },
        after: { content: "Nội dung mới" },
      }),
    });
  });

  it("rejects editing a hidden comment", async () => {
    const database = prisma as unknown as {
      communityComment: { findUnique: jest.Mock };
    };
    database.communityComment.findUnique.mockResolvedValue({
      id: "comment-1",
      userId: "user-1",
      status: "HIDDEN",
      deletedAt: null,
    });

    await expect(
      service.updateComment("user-1", "comment-1", { content: "Nội dung mới" }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
    (prisma as any).communityReaction.findUnique.mockResolvedValueOnce(null);
    (prisma as any).communityReaction.create.mockResolvedValue({
      id: "reaction-1",
      type: CommunityReactionType.LIKE,
    });
    await service.toggleReaction("user-1", {
      sourceKey: commentDto.sourceKey,
      type: CommunityReactionType.LIKE,
    });

    (prisma as any).communityReaction.findUnique.mockResolvedValueOnce({
      id: "reaction-1",
      type: CommunityReactionType.LIKE,
    });
    (prisma as any).communityReaction.update.mockResolvedValue({
      id: "reaction-1",
      type: CommunityReactionType.LOVE,
    });
    await service.toggleReaction("user-1", {
      sourceKey: commentDto.sourceKey,
      type: CommunityReactionType.LOVE,
    });

    (prisma as any).communityReaction.findUnique.mockResolvedValueOnce({
      id: "reaction-1",
      type: CommunityReactionType.LOVE,
    });
    await service.toggleReaction("user-1", {
      sourceKey: commentDto.sourceKey,
      type: CommunityReactionType.LOVE,
    });

    expect((prisma as any).communityReaction.create).toHaveBeenCalledTimes(1);
    expect((prisma as any).communityReaction.update).toHaveBeenCalledTimes(1);
    expect((prisma as any).communityReaction.delete).toHaveBeenCalledTimes(1);
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
  it("returns only five replies and sets hasMoreReplies when a root comment has six replies", async () => {
    const database = prisma as unknown as {
      communityComment: {
        findMany: jest.Mock;
        count: jest.Mock;
      };
    };

    const rootComment = {
      id: "comment-21",
      content: "Bình luận gốc.",
      createdAt: new Date("2026-10-20T00:00:00.000Z"),
      deletedAt: null,
      status: "PUBLISHED",
      user: { id: "user-1", fullName: "Thành viên" },
    };
    const replies = Array.from({ length: 6 }, (_, index) => ({
      id: `reply-${index + 1}`,
      parentId: rootComment.id,
      content: `Reply ${index + 1}`,
      createdAt: new Date(`2026-10-20T00:0${index}:00.000Z`),
      deletedAt: null,
      status: "PUBLISHED",
      user: { id: `user-${index + 2}`, fullName: `Thành viên ${index + 2}` },
    }));

    database.communityComment.findMany
      .mockResolvedValueOnce([rootComment] as any)
      .mockResolvedValueOnce(replies as any);

    database.communityComment.count.mockResolvedValue(1);

    await expect(
      service.listComments(commentDto.sourceKey, 1, 20),
    ).resolves.toEqual({
      items: [
        {
          id: rootComment.id,
          content: rootComment.content,
          createdAt: rootComment.createdAt,
          user: rootComment.user,
          status: rootComment.status,
          replies: replies.slice(0, 5).map((reply) => ({
            id: reply.id,
            content: reply.content,
            createdAt: reply.createdAt,
            user: reply.user,
            status: reply.status,
          })),
          hasMoreReplies: true,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    expect(database.communityComment.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          sourceKey: commentDto.sourceKey,
          parentId: rootComment.id,
        },
        orderBy: { createdAt: "asc" },
        take: 6,
      }),
    );
  });

  it("paginates replies for an existing root comment", async () => {
    const database = prisma as unknown as {
      communityComment: {
        findUnique: jest.Mock;
        findMany: jest.Mock;
        count: jest.Mock;
      };
    };

    const rootComment = {
      id: "comment-21",
      sourceKey: commentDto.sourceKey,
      parentId: null,
      deletedAt: null,
    };
    const replies = [{
      id: "reply-21",
      content: "Phản hồi công khai.",
      createdAt: new Date("2026-10-20T00:01:00.000Z"),
      deletedAt: null,
      status: "PUBLISHED",
      user: { id: "user-2", fullName: "Thành viên 2" },
    }];

    database.communityComment.findUnique.mockResolvedValue(rootComment);
    database.communityComment.findMany.mockResolvedValue(replies);
    database.communityComment.count.mockResolvedValue(37);

    await expect(
      service.listReplies(commentDto.sourceKey, "comment-21", 2, 20),
    ).resolves.toEqual({
      items: [{
        id: replies[0].id,
        content: replies[0].content,
        createdAt: replies[0].createdAt,
        user: replies[0].user,
        status: replies[0].status,
      }],
      total: 37,
      page: 2,
      limit: 20,
    });

    expect(database.communityComment.findUnique).toHaveBeenCalledWith({
      where: { id: "comment-21" },
    });

    expect(database.communityComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sourceKey: commentDto.sourceKey,
          parentId: "comment-21",
        },
        orderBy: { createdAt: "asc" },
        skip: 20,
        take: 20,
      }),
    );

    expect(database.communityComment.count).toHaveBeenCalledWith({
      where: {
        sourceKey: commentDto.sourceKey,
        parentId: "comment-21",
      },
    });
  });

  it("rejects replies when the root comment does not belong to the story", async () => {
    const database = prisma as unknown as {
      communityComment: {
        findUnique: jest.Mock;
      };
    };

    database.communityComment.findUnique.mockResolvedValue({
      id: "comment-21",
      sourceKey: "another-story",
      parentId: null,
      deletedAt: null,
    });

    await expect(
      service.listReplies(commentDto.sourceKey, "comment-21", 1, 20),
    ).rejects.toThrow();
  });

});
