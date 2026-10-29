import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PartnerStatus, RoleName, SupportPointStatus, UserStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { PrismaService } from "../prisma/prisma.service";
import { SupportPointsService } from "./support-points.service";

describe("SupportPointsService", () => {
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof prisma) => unknown) =>
      callback(prisma),
    ),
    user: { findUnique: jest.fn() },
    supportPoint: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  } as unknown as PrismaService;

  const service = new SupportPointsService(prisma);
  const partner: AuthenticatedUser = {
    id: "user-1",
    role: RoleName.PARTNER,
    authVersion: 1,
  };
  const admin: AuthenticatedUser = {
    id: "admin-1",
    role: RoleName.ADMIN,
    authVersion: 1,
  };
  const dto = {
    name: "Nhà thuốc An Tâm",
    description: "Hỗ trợ phát thuốc miễn phí cho bệnh nhân khó khăn tại khu vực nội thành Hà Nội.",
    address: "123 Đường ABC",
    latitude: 21.02,
    longitude: 105.84,
    supportType: "MEDICINE",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PARTNER },
      partnerMembership: { id: "partner-1", status: PartnerStatus.ACTIVE },
    });
    (prisma.supportPoint.create as jest.Mock).mockResolvedValue({
      id: "point-1",
      status: SupportPointStatus.DRAFT,
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it("creates a draft support point with ownership and audit", async () => {
    const point = await service.create(partner, dto);
    expect(point.status).toBe(SupportPointStatus.DRAFT);
    expect(prisma.supportPoint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerPartnerId: "partner-1",
        status: SupportPointStatus.DRAFT,
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "CREATE_SUPPORT_POINT" }),
    });
  });

  it("lists only published points on the public map", async () => {
    (prisma.supportPoint.findMany as jest.Mock).mockResolvedValue([
      { id: "point-1", name: "Nhà thuốc An Tâm", supportType: "MEDICINE" },
    ]);

    const result = await service.listPublicMap("MEDICINE");
    expect(prisma.supportPoint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: SupportPointStatus.PUBLISHED,
          deletedAt: null,
          supportType: "MEDICINE",
        },
      }),
    );
    expect(result.total).toBe(1);
  });

  it("forbids submitting a point owned by another partner", async () => {
    (prisma.supportPoint.findUnique as jest.Mock).mockResolvedValue({
      id: "point-1",
      ownerPartnerId: "partner-other",
      status: SupportPointStatus.DRAFT,
    });

    await expect(service.submit(partner, "point-1")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("returns 404 when submitting a missing point", async () => {
    (prisma.supportPoint.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.submit(partner, "missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rejects submit from a non-draft status", async () => {
    (prisma.supportPoint.findUnique as jest.Mock).mockResolvedValue({
      id: "point-1",
      ownerPartnerId: "partner-1",
      status: SupportPointStatus.PENDING,
    });

    await expect(service.submit(partner, "point-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("approves a pending point as admin", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "admin-1",
      role: { name: RoleName.ADMIN },
    });
    (prisma.supportPoint.findUnique as jest.Mock).mockResolvedValue({
      id: "point-1",
      status: SupportPointStatus.PENDING,
    });
    (prisma.supportPoint.update as jest.Mock).mockResolvedValue({
      id: "point-1",
      status: SupportPointStatus.PUBLISHED,
    });

    const updated = await service.review(admin, "point-1", "APPROVE");
    expect(updated.status).toBe(SupportPointStatus.PUBLISHED);
  });
});
