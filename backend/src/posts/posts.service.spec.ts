import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PostStatus, RoleName, UserStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ReviewDecision } from "./dto/review-post.dto";
import { PostsService } from "./posts.service";

describe("PostsService", () => {
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof prisma) => unknown) =>
      callback(prisma),
    ),
    user: { findUnique: jest.fn() },
    post: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    postRevision: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    moderationAction: { create: jest.fn() },
    outboxEvent: { create: jest.fn() },
  } as unknown as PrismaService;

  const service = new PostsService(prisma);
  const dto = {
    title: "Hành trình chiến thắng bệnh ung thư",
    body: "Câu chuyện của tôi đủ dài để vượt ngưỡng tối thiểu của hệ thống.",
    summary: "Tóm tắt",
    idempotencyKey: "post-key-0001",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.ADMIN },
    });
    (prisma.post.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.post.create as jest.Mock).mockResolvedValue({
      id: "post-1",
      authorId: "user-1",
      status: PostStatus.DRAFT,
    });
    (prisma.postRevision.create as jest.Mock).mockResolvedValue({
      id: "rev-1",
      title: dto.title,
    });
    (prisma.post.update as jest.Mock).mockResolvedValue({
      id: "post-1",
      currentRevisionId: "rev-1",
      status: PostStatus.DRAFT,
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
    (prisma.moderationAction.create as jest.Mock).mockResolvedValue({});
    (prisma.outboxEvent.create as jest.Mock).mockResolvedValue({});
  });

  it("creates a draft post with revision and audit in one transaction", async () => {
    const result = await service.create("user-1", dto);

    expect(prisma.post.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CREATE_POST",
        entityType: "POST",
        after: { status: PostStatus.DRAFT },
      }),
    });
    expect(result.currentRevision).toEqual(expect.objectContaining({ id: "rev-1" }));
  });

  it("rejects create when the account is inactive", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      status: UserStatus.LOCKED,
      deletedAt: null,
    });

    await expect(service.create("user-1", dto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("rejects a similar post by content hash", async () => {
    (prisma.post.findFirst as jest.Mock).mockResolvedValue({ id: "post-dup" });

    await expect(service.create("user-1", dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("submits a draft for review", async () => {
    (prisma.post.findUnique as jest.Mock).mockResolvedValue({
      id: "post-1",
      authorId: "user-1",
      status: PostStatus.DRAFT,
      currentRevision: { title: dto.title },
    });
    (prisma.post.update as jest.Mock).mockResolvedValue({
      id: "post-1",
      status: PostStatus.PENDING,
    });

    const updated = await service.submitForReview("user-1", "post-1");
    expect(updated.status).toBe(PostStatus.PENDING);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "SUBMIT_POST" }),
    });
  });

  it("forbids submitting another author's post", async () => {
    (prisma.post.findUnique as jest.Mock).mockResolvedValue({
      id: "post-1",
      authorId: "user-2",
      status: PostStatus.DRAFT,
    });

    await expect(
      service.submitForReview("user-1", "post-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("returns 404 when submitting a missing post", async () => {
    (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.submitForReview("user-1", "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("approves a pending post", async () => {
    (prisma.post.findUnique as jest.Mock).mockResolvedValue({
      id: "post-1",
      status: PostStatus.PENDING,
      authorId: "user-1",
      currentRevisionId: "rev-1",
      currentRevision: { title: dto.title },
    });
    (prisma.post.update as jest.Mock).mockResolvedValue({
      id: "post-1",
      status: PostStatus.PUBLISHED,
    });

    const updated = await service.review("admin-1", "post-1", {
      decision: ReviewDecision.APPROVE,
    });
    expect(updated.status).toBe(PostStatus.PUBLISHED);
    expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
  });

  it("rejects a pending post with reason, audit and outbox", async () => {
    (prisma.post.findUnique as jest.Mock).mockResolvedValue({
      id: "post-1",
      status: PostStatus.PENDING,
      authorId: "user-1",
      currentRevisionId: "rev-1",
      currentRevision: { title: dto.title },
    });
    (prisma.post.update as jest.Mock).mockResolvedValue({
      id: "post-1",
      status: PostStatus.REJECTED,
    });

    await service.review("admin-1", "post-1", {
      decision: ReviewDecision.REJECT,
      reason: "Nội dung chưa đủ nguồn y tế.",
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "REJECT_POST" }),
    });
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "POST_REJECTED" }),
    });
  });

  it("requires a reject reason of at least 10 characters", async () => {
    (prisma.post.findUnique as jest.Mock).mockResolvedValue({
      id: "post-1",
      status: PostStatus.PENDING,
      currentRevisionId: "rev-1",
    });

    await expect(
      service.review("admin-1", "post-1", {
        decision: ReviewDecision.REJECT,
        reason: "ngắn",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("forbids a non-admin from reviewing posts", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      role: { name: RoleName.PATIENT },
    });

    await expect(
      service.review("user-1", "post-1", { decision: ReviewDecision.APPROVE }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
