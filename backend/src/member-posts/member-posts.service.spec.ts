import { ConflictException } from "@nestjs/common";
import {
  MemberPostStatus,
  NotificationKind,
  ProfileVisibility,
  RoleName,
  UserStatus,
} from "@prisma/client";

import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { MemberPostsService } from "./member-posts.service";

describe("MemberPostsService", () => {
  const tx = {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    memberPost: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (writer: typeof tx) => unknown) =>
      callback(tx),
    ),
    user: tx.user,
    memberPost: { findMany: jest.fn() },
  } as unknown as PrismaService;
  const notify = jest.fn();
  const service = new MemberPostsService(prisma, {
    create: notify,
  } as unknown as NotificationsService);
  const author = {
    id: "PATIENT-1",
    fullName: "Minh Anh",
    status: UserStatus.ACTIVE,
    deletedAt: null,
    role: { name: RoleName.PATIENT },
  };
  const post = {
    id: "POST-1",
    userId: "PATIENT-1",
    authorName: "Minh Anh",
    title: "Một ngày nhiều hy vọng",
    content: "Nội dung câu chuyện đủ dài để chia sẻ cùng mọi người.",
    status: MemberPostStatus.PENDING,
    updatedAt: new Date("2026-10-23T07:00:00Z"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.user.findUnique.mockResolvedValue(author);
    tx.user.findMany.mockResolvedValue([{ id: "ADMIN-1" }]);
    tx.memberPost.findUnique.mockResolvedValue(null);
    tx.memberPost.create.mockResolvedValue(post);
    tx.memberPost.updateMany.mockResolvedValue({ count: 1 });
    tx.memberPost.findUniqueOrThrow.mockResolvedValue({
      ...post,
      user: author,
      reviewedAt: new Date(),
    });
  });

  it("includes author profile visibility without exposing contact details in public stories", async () => {
    const database = prisma as unknown as {
      memberPost: { findMany: jest.Mock };
    };
    database.memberPost.findMany.mockResolvedValue([
      {
        ...post,
        status: MemberPostStatus.PUBLISHED,
        user: { profile: { visibility: ProfileVisibility.PRIVATE } },
      },
    ]);

    const result = await service.listPublic();

    expect(result[0]).toEqual(
      expect.objectContaining({ profileVisibility: ProfileVisibility.PRIVATE }),
    );
    expect(result[0]).not.toHaveProperty("user");
    expect(result[0]).not.toHaveProperty("email");
    expect(result[0]).not.toHaveProperty("phone");
  });

  it("notifies admins after a pending story is saved", async () => {
    await service.create("PATIENT-1", {
      title: post.title,
      content: post.content,
      status: "PENDING",
    });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "ADMIN-1",
        kind: NotificationKind.STORY_SUBMITTED,
        link: "/admin/kiem-duyet",
      }),
      tx,
    );
  });

  it("returns an imported legacy story without creating or notifying twice", async () => {
    tx.memberPost.findUnique.mockResolvedValue(post);
    await service.create("PATIENT-1", {
      title: post.title,
      content: post.content,
      status: "PENDING",
      legacyId: "POST-1234567890123-abcdef",
    });
    expect(tx.memberPost.create).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("notifies the author only after an admin publishes the story", async () => {
    tx.user.findUnique.mockResolvedValue({
      ...author,
      role: { name: RoleName.ADMIN },
    });
    tx.memberPost.findUniqueOrThrow.mockResolvedValue({
      ...post,
      status: MemberPostStatus.PUBLISHED,
      user: author,
      reviewedAt: new Date("2026-10-23T07:01:00Z"),
    });
    await service.review("ADMIN-1", post.id, { decision: "PUBLISHED" });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "PATIENT-1",
        kind: NotificationKind.STORY_PUBLISHED,
      }),
      tx,
    );
  });

  it("does not notify when a pending story was already reviewed", async () => {
    tx.user.findUnique.mockResolvedValue({
      ...author,
      role: { name: RoleName.ADMIN },
    });
    tx.memberPost.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.review("ADMIN-1", post.id, { decision: "PUBLISHED" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(notify).not.toHaveBeenCalled();
  });
});
