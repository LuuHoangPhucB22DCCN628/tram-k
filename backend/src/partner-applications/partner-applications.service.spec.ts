import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  PartnerApplicationStatus,
  PartnerStatus,
  RoleName,
  UserStatus,
} from "@prisma/client";

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
  expectedVersion: 0,
};

describe("PartnerApplicationsService", () => {
  const transaction = {
    user: { findUnique: jest.fn() },
    partnerApplication: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    partnerMembership: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    partnerApplicationDocument: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    outboxEvent: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    ),
    user: { findUnique: jest.fn() },
    partnerApplication: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  } as unknown as PrismaService;
  const notifications = {
    create: jest.fn(),
  } as unknown as NotificationsService;
  const service = new PartnerApplicationsService(prisma, notifications);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.ADMIN },
    });
    transaction.partnerApplicationDocument.findMany.mockResolvedValue([
      { id: "document-1", storageKey: dto.documentKeys[0] },
    ]);
    transaction.partnerApplicationDocument.updateMany.mockResolvedValue({
      count: 1,
    });
    transaction.user.findUnique.mockResolvedValue({
      id: "admin-1",
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.ADMIN },
    });
    transaction.partnerMembership.update.mockResolvedValue({
      id: "membership-1",
      userId: "user-1",
      status: PartnerStatus.SUSPENDED,
    });
    transaction.partnerMembership.updateMany.mockResolvedValue({ count: 1 });
    transaction.auditLog.create.mockResolvedValue({});
  });

  it("paginates admin applications and counts only the selected status", async () => {
    const partnerApplication = prisma.partnerApplication as unknown as {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    partnerApplication.findMany.mockResolvedValue([{ id: "application-21" }]);
    partnerApplication.count.mockResolvedValue(45);

    await expect(
      service.listForAdmin("admin-1", PartnerApplicationStatus.PENDING, 2, 20),
    ).resolves.toEqual({
      items: [{ id: "application-21" }],
      total: 45,
      page: 2,
      limit: 20,
    });

    expect(partnerApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: PartnerApplicationStatus.PENDING },
        orderBy: { updatedAt: "desc" },
        skip: 20,
        take: 20,
      }),
    );
    expect(partnerApplication.count).toHaveBeenCalledWith({
      where: { status: PartnerApplicationStatus.PENDING },
    });
  });

  it("saves a new partner application as DRAFT", async () => {
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
      ...data,
    }));

    const result = await service.saveDraft("user-1", {
      organizationName: "Nhóm thiện nguyện An Tâm",
    });

    expect(result.status).toBe(PartnerApplicationStatus.DRAFT);
    expect(transaction.partnerApplication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicantId: "user-1",
        status: PartnerApplicationStatus.DRAFT,
      }),
    });
  });

  it("rejects saving a draft while the application is already pending", async () => {
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

    await expect(
      service.saveDraft("user-1", { organizationName: "Nhóm thiện nguyện An Tâm" }),
    ).rejects.toBeInstanceOf(ConflictException);
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
    expect(result.trackingCode).toMatch(/^TK-\d{8}-[A-F0-9]{6}$/);
    expect(transaction.partnerApplication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicantId: "user-1",
        email: "an@example.com",
        trackingCode: result.trackingCode,
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
    transaction.user.findUnique
      .mockResolvedValueOnce({
        id: "admin-1",
        status: UserStatus.ACTIVE,
        deletedAt: null,
        role: { name: RoleName.ADMIN },
      })
      .mockResolvedValueOnce({
        id: "user-1",
        status: UserStatus.ACTIVE,
        deletedAt: null,
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
    transaction.outboxEvent.create.mockResolvedValue({ id: "event-1" });

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
    expect(transaction.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "PARTNER_APPLICATION_REVIEWED",
        aggregateType: "PartnerApplication",
        aggregateId: "application-1",
        payload: expect.objectContaining({
          applicantId: "user-1",
          applicationId: "application-1",
          status: PartnerApplicationStatus.APPROVED,
        }),
      }),
    });
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("does not approve an application if its applicant is not active", async () => {
    const invalidApplicants = [
      {
        id: "user-1",
        status: UserStatus.PENDING_VERIFY,
        deletedAt: null,
      },
      {
        id: "user-1",
        status: UserStatus.LOCKED,
        deletedAt: null,
      },
      {
        id: "user-1",
        status: UserStatus.DISABLED,
        deletedAt: null,
      },
      {
        id: "user-1",
        status: UserStatus.ACTIVE,
        deletedAt: new Date(),
      },
      null,
    ];

    for (const applicant of invalidApplicants) {
      jest.clearAllMocks();
      transaction.user.findUnique
        .mockResolvedValueOnce({
          id: "admin-1",
          status: UserStatus.ACTIVE,
          deletedAt: null,
          role: { name: RoleName.ADMIN },
        })
        .mockResolvedValueOnce(applicant);
      transaction.partnerApplication.findUnique.mockResolvedValue({
        id: "application-1",
        applicantId: "user-1",
        status: PartnerApplicationStatus.PENDING,
      });

      await expect(
        service.review("admin-1", "application-1", { decision: "APPROVED" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(transaction.partnerApplication.update).not.toHaveBeenCalled();
      expect(transaction.partnerMembership.create).not.toHaveBeenCalled();
      expect(transaction.outboxEvent.create).not.toHaveBeenCalled();
      expect(notifications.create).not.toHaveBeenCalled();
    }
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

  it("suspends an active partner and records the reason in the audit log", async () => {
    transaction.partnerMembership.findUnique.mockResolvedValue({
      id: "membership-1",
      userId: "user-1",
      status: PartnerStatus.ACTIVE,
    });
    transaction.partnerMembership.update.mockResolvedValue({
      id: "membership-1",
      userId: "user-1",
      status: PartnerStatus.SUSPENDED,
    });

    await expect(
      service.changePartnerStatus("admin-1", "user-1", {
        expectedStatus: PartnerStatus.ACTIVE,
        status: PartnerStatus.SUSPENDED,
        reason: "Tạm đình chỉ để xác minh hồ sơ.",
      }),
    ).resolves.toMatchObject({ status: PartnerStatus.SUSPENDED });

    expect(transaction.partnerMembership.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        status: PartnerStatus.ACTIVE,
      },
      data: { status: PartnerStatus.SUSPENDED },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "admin-1",
        action: "CHANGE_PARTNER_STATUS",
        entityType: "PARTNER_MEMBERSHIP",
        entityId: "membership-1",
        before: { status: PartnerStatus.ACTIVE },
        after: { status: PartnerStatus.SUSPENDED },
        reason: "Tạm đình chỉ để xác minh hồ sơ.",
      }),
    });
  });

  it("restores a suspended partner to active", async () => {
    transaction.partnerMembership.findUnique.mockResolvedValue({
      id: "membership-1",
      userId: "user-1",
      status: PartnerStatus.SUSPENDED,
    });
    transaction.partnerMembership.update.mockResolvedValue({
      id: "membership-1",
      userId: "user-1",
      status: PartnerStatus.ACTIVE,
    });

    await expect(
      service.changePartnerStatus("admin-1", "user-1", {
        expectedStatus: PartnerStatus.SUSPENDED,
        status: PartnerStatus.ACTIVE,
        reason: "Đã xác minh và khôi phục quyền đối tác.",
      }),
    ).resolves.toMatchObject({ status: PartnerStatus.ACTIVE });

    expect(transaction.partnerMembership.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        status: PartnerStatus.SUSPENDED,
      },
      data: { status: PartnerStatus.ACTIVE },
    });
  });

  it("denies a non-admin from changing partner status", async () => {
    transaction.user.findUnique.mockResolvedValue({
      id: "user-2",
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.PATIENT },
    });

    await expect(
      service.changePartnerStatus("user-2", "user-1", {
        expectedStatus: PartnerStatus.ACTIVE,
        status: PartnerStatus.SUSPENDED,
        reason: "Tạm đình chỉ để xác minh hồ sơ.",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.partnerMembership.updateMany).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns not found when the target has no partner membership", async () => {
    transaction.partnerMembership.findUnique.mockResolvedValue(null);

    await expect(
      service.changePartnerStatus("admin-1", "user-1", {
        expectedStatus: PartnerStatus.ACTIVE,
        status: PartnerStatus.SUSPENDED,
        reason: "Tạm đình chỉ để xác minh hồ sơ.",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transaction.partnerMembership.updateMany).not.toHaveBeenCalled();
  });

  it("rejects stale expected status without updating or auditing", async () => {
    transaction.partnerMembership.findUnique.mockResolvedValue({
      id: "membership-1",
      userId: "user-1",
      status: PartnerStatus.SUSPENDED,
    });

    await expect(
      service.changePartnerStatus("admin-1", "user-1", {
        expectedStatus: PartnerStatus.ACTIVE,
        status: PartnerStatus.SUSPENDED,
        reason: "Tạm đình chỉ để xác minh hồ sơ.",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.partnerMembership.updateMany).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects requests that do not change partner status", async () => {
    transaction.partnerMembership.findUnique.mockResolvedValue({
      id: "membership-1",
      userId: "user-1",
      status: PartnerStatus.ACTIVE,
    });

    await expect(
      service.changePartnerStatus("admin-1", "user-1", {
        expectedStatus: PartnerStatus.ACTIVE,
        status: PartnerStatus.ACTIVE,
        reason: "Xác nhận lại trạng thái đang hoạt động.",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.partnerMembership.updateMany).not.toHaveBeenCalled();
  });

  it("rejects if the partner status changed before the conditional update", async () => {
    transaction.partnerMembership.findUnique.mockResolvedValue({
      id: "membership-1",
      userId: "user-1",
      status: PartnerStatus.ACTIVE,
    });
    transaction.partnerMembership.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.changePartnerStatus("admin-1", "user-1", {
        expectedStatus: PartnerStatus.ACTIVE,
        status: PartnerStatus.SUSPENDED,
        reason: "Tạm đình chỉ để xác minh hồ sơ.",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });
});
