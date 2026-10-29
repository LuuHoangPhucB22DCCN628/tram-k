import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ContentStatus, RoleName, SearchDocumentType, UserStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { PrismaService } from "../prisma/prisma.service";
import { ContentsService } from "./contents.service";

describe("ContentsService", () => {
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof prisma) => unknown) =>
      callback(prisma),
    ),
    user: { findUnique: jest.fn() },
    content: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    contentRevision: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  } as unknown as PrismaService;

  const service = new ContentsService(prisma);
  const admin: AuthenticatedUser = {
    id: "admin-1",
    role: RoleName.ADMIN,
    authVersion: 1,
  };
  const dto = {
    title: "Cách chăm sóc bệnh nhân ung thư",
    slug: "cach-cham-soc-benh-nhan-ung-thu",
    type: SearchDocumentType.GUIDE,
    sanitizedBody: "<p>Nội dung chi tiết đủ dài để vượt ngưỡng tối thiểu của hệ thống CMS.</p>",
    sourceId: "source-1",
    reviewedById: "reviewer-1",
    reviewedAt: "2026-10-01T00:00:00.000Z",
    nextReviewAt: "2027-10-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "admin-1",
      status: UserStatus.ACTIVE,
      role: { name: RoleName.ADMIN },
    });
    (prisma.content.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.content.create as jest.Mock).mockResolvedValue({
      id: "content-1",
      slug: dto.slug,
      status: ContentStatus.DRAFT,
    });
    (prisma.contentRevision.create as jest.Mock).mockResolvedValue({ id: "rev-1" });
    (prisma.content.update as jest.Mock).mockResolvedValue({
      id: "content-1",
      currentRevisionId: "rev-1",
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it("lists only published public contents", async () => {
    (prisma.content.findMany as jest.Mock).mockResolvedValue([{ id: "content-1" }]);
    (prisma.content.count as jest.Mock).mockResolvedValue(1);

    const result = await service.listPublic(SearchDocumentType.GUIDE, 1, 12);
    expect(prisma.content.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ContentStatus.PUBLISHED,
          deletedAt: null,
          type: SearchDocumentType.GUIDE,
        }),
      }),
    );
    expect(result.total).toBe(1);
  });

  it("creates a draft CMS content as admin", async () => {
    const created = await service.create(admin, dto);
    expect(created.currentRevisionId).toBe("rev-1");
    expect(prisma.content.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: dto.slug,
        status: ContentStatus.DRAFT,
      }),
    });
  });

  it("rejects a duplicate slug", async () => {
    (prisma.content.findUnique as jest.Mock).mockResolvedValue({ id: "existing" });
    await expect(service.create(admin, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("forbids a non-admin from creating CMS content", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      status: UserStatus.ACTIVE,
      role: { name: RoleName.PATIENT },
    });
    await expect(service.create(admin, dto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("publishes content that still has a valid medical review window", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-20T00:00:00.000Z"));
    (prisma.content.findUnique as jest.Mock).mockResolvedValue({
      id: "content-1",
      status: ContentStatus.DRAFT,
      sourceId: "source-1",
      reviewedById: "reviewer-1",
      reviewedAt: new Date("2026-10-01T00:00:00.000Z"),
      nextReviewAt: new Date("2027-10-01T00:00:00.000Z"),
    });
    (prisma.content.update as jest.Mock).mockResolvedValue({
      id: "content-1",
      status: ContentStatus.PUBLISHED,
    });

    const updated = await service.publish(admin, "content-1", {});
    expect(updated.status).toBe(ContentStatus.PUBLISHED);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "PUBLISH_CONTENT" }),
    });
    jest.useRealTimers();
  });

  it("returns 404 when publishing missing content", async () => {
    (prisma.content.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.publish(admin, "missing", {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("blocks publish when the medical source is missing", async () => {
    (prisma.content.findUnique as jest.Mock).mockResolvedValue({
      id: "content-1",
      status: ContentStatus.DRAFT,
      sourceId: null,
      reviewedById: "reviewer-1",
      reviewedAt: new Date("2026-10-01T00:00:00.000Z"),
      nextReviewAt: new Date("2027-10-01T00:00:00.000Z"),
    });

    await expect(service.publish(admin, "content-1", {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
