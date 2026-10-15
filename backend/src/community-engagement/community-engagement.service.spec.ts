import {
  BadRequestException,
  ForbiddenException,
  HttpException,
} from "@nestjs/common";
import { CommunityReactionType, RoleName, UserStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
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

      return (arg as (client: typeof transaction) => unknown)(transaction);
    }),
    communityComment: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    communityReaction: { groupBy: jest.fn() },
  } as unknown as PrismaService;
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
  });

  it("paginates root comments and returns pagination metadata", async () => {
    const database = prisma as unknown as {
      communityComment: {
        findMany: jest.Mock;
        count: jest.Mock;
      };
    };

    const items = [{ id: "comment-21" }];

    database.communityComment.findMany
      .mockResolvedValueOnce(items as any)
      .mockResolvedValueOnce([] as any);

    database.communityComment.count.mockResolvedValue(45);

    await expect(
      service.listComments(commentDto.sourceKey, 2, 20),
    ).resolves.toEqual({
      items: [
        {
          ...items[0],
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
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
        take: 6,
      }),
    );
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
  it("returns only five replies and sets hasMoreReplies when a root comment has six replies", async () => {
    const database = prisma as unknown as {
      communityComment: {
        findMany: jest.Mock;
        count: jest.Mock;
      };
    };

    const rootComment = { id: "comment-21" };
    const replies = Array.from({ length: 6 }, (_, index) => ({
      id: `reply-${index + 1}`,
      parentId: rootComment.id,
      content: `Reply ${index + 1}`,
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
          ...rootComment,
          replies: replies.slice(0, 5),
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
          deletedAt: null,
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
    const replies = [{ id: "reply-21" }];

    database.communityComment.findUnique.mockResolvedValue(rootComment);
    database.communityComment.findMany.mockResolvedValue(replies);
    database.communityComment.count.mockResolvedValue(37);

    await expect(
      service.listReplies(commentDto.sourceKey, "comment-21", 2, 20),
    ).resolves.toEqual({
      items: replies,
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
          deletedAt: null,
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
        deletedAt: null,
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
