import { ConflictException, ForbiddenException } from "@nestjs/common";
import { PartnerApplicationStatus, RoleName, UserStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PartnerApplicationsService } from "./partner-applications.service";

const dto = {
  organizationName: "Nhóm thiện nguyện An Tâm",
  representativeName: "Nguyễn An",
  phone: "0912345678",
  email: "AN@EXAMPLE.COM",
  address: "Số 10 Trần Phú, Hà Nội",
  introduction:
    "Chúng tôi hỗ trợ suất ăn và phương tiện cho bệnh nhân khó khăn.",
  documentKeys: ["private/partner/user-1/xac-minh.pdf"],
};

describe("PartnerApplicationsService", () => {
  const transaction = {
    user: { findUnique: jest.fn() },
    partnerApplication: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    partnerMembership: { create: jest.fn() },
    partnerApplicationDocument: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    ),
    partnerApplication: { findUnique: jest.fn(), findMany: jest.fn() },
  } as unknown as PrismaService;
  const notifications = {
    create: jest.fn(),
  } as unknown as NotificationsService;
  const service = new PartnerApplicationsService(prisma, notifications);

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.partnerApplicationDocument.findMany.mockResolvedValue([
      { id: "document-1", storageKey: dto.documentKeys[0] },
    ]);
    transaction.partnerApplicationDocument.updateMany.mockResolvedValue({
      count: 1,
    });
  });

  it("creates one pending application for an active member", async () => {
    transaction.user.findUnique.mockResolvedValue({
      id: "user-1",
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PATIENT },
      partnerApplication: null,
      partnerMembership: null,
    });
    transaction.partnerApplication.create.mockImplementation(({ data }) => ({
      id: "application-1",
      status: PartnerApplicationStatus.PENDING,
      ...data,
    }));

    const result = await service.submit("user-1", dto);
    expect(result.status).toBe(PartnerApplicationStatus.PENDING);
    expect(transaction.partnerApplication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicantId: "user-1",
        email: "an@example.com",
      }),
    });
  });

  it("rejects duplicate pending applications", async () => {
    transaction.user.findUnique.mockResolvedValue({
      id: "user-1",
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PATIENT },
      partnerApplication: {
        id: "application-1",
        status: PartnerApplicationStatus.PENDING,
      },
      partnerMembership: null,
    });
    await expect(service.submit("user-1", dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("approves the application and grants additive partner membership atomically", async () => {
    transaction.user.findUnique.mockResolvedValue({
      id: "admin-1",
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.ADMIN },
    });
    transaction.partnerApplication.findUnique.mockResolvedValue({
      id: "application-1",
      applicantId: "user-1",
      status: PartnerApplicationStatus.PENDING,
    });
    transaction.partnerApplication.update.mockResolvedValue({
      id: "application-1",
      status: PartnerApplicationStatus.APPROVED,
    });
    transaction.partnerMembership.create.mockResolvedValue({
      id: "membership-1",
    });
    (notifications.create as jest.Mock).mockResolvedValue({
      id: "notification-1",
    });

    const result = await service.review("admin-1", "application-1", {
      decision: "APPROVED",
    });
    expect(result.status).toBe(PartnerApplicationStatus.APPROVED);
    expect(transaction.partnerMembership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        applicationId: "application-1",
        grantedById: "admin-1",
      }),
    });
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "user-1",
        kind: "PARTNER_APPLICATION_APPROVED",
      }),
      transaction,
    );
  });

  it("does not allow a non-admin to review applications", async () => {
    transaction.user.findUnique.mockResolvedValue({
      id: "user-2",
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PATIENT },
    });
    transaction.partnerApplication.findUnique.mockResolvedValue({
      id: "application-1",
      status: PartnerApplicationStatus.PENDING,
    });
    await expect(
      service.review("user-2", "application-1", { decision: "APPROVED" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.partnerMembership.create).not.toHaveBeenCalled();
  });
});
