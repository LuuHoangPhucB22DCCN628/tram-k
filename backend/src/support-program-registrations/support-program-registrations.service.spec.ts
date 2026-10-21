import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import {
  NotificationKind,
  PartnerStatus,
  RoleName,
  SearchDocumentType,
  SupportProgramRegistrationStatus,
  UserStatus,
} from "@prisma/client";

import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SupportProgramRegistrationsService } from "./support-program-registrations.service";

describe("SupportProgramRegistrationsService", () => {
  const program = {
    id: "resource-1",
    sourceId: "PROGRAM-1",
    type: SearchDocumentType.SUPPORT_PROGRAM,
    status: "PUBLISHED",
    title: "Chương trình hỗ trợ",
    payload: {
      ownerId: "PARTNER-1",
      capacity: 10,
      startAt: "2026-11-01T09:00:00.000Z",
      endAt: "2026-11-01T11:00:00.000Z",
      registrationOpenAt: "2026-10-01T00:00:00.000Z",
      registrationCloseAt: "2026-10-31T23:59:59.000Z",
    },
  };
  const registration = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  };
  const managedResource = { findUnique: jest.fn() };
  const user = { findUnique: jest.fn() };
  const transaction = {
    $queryRaw: jest.fn(),
    supportProgramRegistration: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    registrationStatusHistory: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    supportProgramRegistration: registration,
    managedResource,
    user,
    $transaction: jest.fn(
      (operation: (client: typeof transaction) => unknown) =>
        operation(transaction),
    ),
  } as unknown as PrismaService;
  const notificationCreate = jest.fn();
  const notifications = { create: notificationCreate } as unknown as NotificationsService;
  const service = new SupportProgramRegistrationsService(prisma, notifications);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date("2026-10-22T05:00:00.000Z"));
    managedResource.findUnique.mockResolvedValue(program);
    registration.findMany.mockResolvedValue([{ id: "registration-1" }]);
    registration.findUnique.mockResolvedValue(null);
    transaction.supportProgramRegistration.findUnique.mockResolvedValue(null);
    transaction.supportProgramRegistration.count.mockResolvedValue(0);
    transaction.supportProgramRegistration.create.mockResolvedValue({
      id: "registration-new",
      status: SupportProgramRegistrationStatus.CONFIRMED,
    });
    transaction.supportProgramRegistration.update.mockResolvedValue({
      id: "registration-1",
      status: SupportProgramRegistrationStatus.CANCELLED,
    });
    transaction.supportProgramRegistration.findFirst.mockResolvedValue(null);
    transaction.registrationStatusHistory.create.mockResolvedValue({});
    transaction.auditLog.create.mockResolvedValue({});
    transaction.$queryRaw.mockResolvedValue([]);
    notificationCreate.mockResolvedValue({});
    user.findUnique.mockResolvedValue({
      id: "PARTNER-1",
      deletedAt: null,
      status: UserStatus.ACTIVE,
      fullName: "Member One",
      email: "member@example.com",
      role: { name: RoleName.PATIENT },
      partnerMembership: {
        id: "membership-1",
        status: PartnerStatus.ACTIVE,
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("allows an active partner to list registrations for their own program", async () => {
    await expect(
      service.forProgram(
        { id: "PARTNER-1", role: RoleName.PARTNER, authVersion: 1 },
        "PROGRAM-1",
      ),
    ).resolves.toEqual([{ id: "registration-1" }]);
    expect(registration.findMany).toHaveBeenCalledWith({
      where: { programId: "PROGRAM-1" },
      orderBy: [{ registeredAt: "desc" }],
    });
  });

  it("denies suspended partners access to registrations for their program", async () => {
    user.findUnique.mockResolvedValue({
      id: "PARTNER-1",
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.PARTNER },
      partnerMembership: {
        id: "membership-1",
        status: PartnerStatus.SUSPENDED,
      },
    });

    await expect(
      service.forProgram(
        { id: "PARTNER-1", role: RoleName.PARTNER, authVersion: 1 },
        "PROGRAM-1",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(registration.findMany).not.toHaveBeenCalled();
  });

  it("denies active partners access to another partner's registrations", async () => {
    managedResource.findUnique.mockResolvedValue({
      ...program,
      payload: { ...program.payload, ownerId: "PARTNER-2" },
    });

    await expect(
      service.forProgram(
        { id: "PARTNER-1", role: RoleName.PARTNER, authVersion: 1 },
        "PROGRAM-1",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(registration.findMany).not.toHaveBeenCalled();
  });

  it("allows an active Admin to access program registrations", async () => {
    user.findUnique.mockResolvedValue({
      id: "ADMIN-1",
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.ADMIN },
      partnerMembership: null,
    });

    await expect(
      service.forProgram(
        { id: "ADMIN-1", role: RoleName.ADMIN, authVersion: 1 },
        "PROGRAM-1",
      ),
    ).resolves.toEqual([{ id: "registration-1" }]);
  });

  it("creates a confirmed registration and writes its initial status history", async () => {
    await service.register(
      { id: "MEMBER-1", role: RoleName.PATIENT, authVersion: 1 },
      "PROGRAM-1",
    );

    expect(transaction.supportProgramRegistration.count).toHaveBeenCalledWith({
      where: {
        programId: "PROGRAM-1",
        status: SupportProgramRegistrationStatus.CONFIRMED,
      },
    });
    expect(transaction.supportProgramRegistration.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        programId: "PROGRAM-1",
        userId: "MEMBER-1",
        status: SupportProgramRegistrationStatus.CONFIRMED,
      }),
    });
    expect(transaction.registrationStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromStatus: null,
        toStatus: SupportProgramRegistrationStatus.CONFIRMED,
        actorId: "MEMBER-1",
      }),
    });
  });

  it("puts a new registration on the waitlist when all confirmed slots are full", async () => {
    transaction.supportProgramRegistration.count.mockResolvedValue(10);
    transaction.supportProgramRegistration.create.mockResolvedValue({
      id: "registration-waitlisted",
      status: SupportProgramRegistrationStatus.WAITLISTED,
    });

    await service.register(
      { id: "MEMBER-1", role: RoleName.PATIENT, authVersion: 1 },
      "PROGRAM-1",
    );

    expect(transaction.supportProgramRegistration.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: SupportProgramRegistrationStatus.WAITLISTED,
        confirmedAt: null,
        waitlistedAt: expect.any(Date),
      }),
    });
  });

  it("re-registers a cancelled member on the existing row and resets its timestamps", async () => {
    transaction.supportProgramRegistration.findUnique.mockResolvedValue({
      id: "registration-1",
      status: SupportProgramRegistrationStatus.CANCELLED,
    });
    transaction.supportProgramRegistration.update.mockResolvedValue({
      id: "registration-1",
      status: SupportProgramRegistrationStatus.CONFIRMED,
    });

    await service.register(
      { id: "MEMBER-1", role: RoleName.PATIENT, authVersion: 1 },
      "PROGRAM-1",
    );

    expect(transaction.supportProgramRegistration.create).not.toHaveBeenCalled();
    expect(transaction.supportProgramRegistration.update).toHaveBeenCalledWith({
      where: { id: "registration-1" },
      data: expect.objectContaining({
        status: SupportProgramRegistrationStatus.CONFIRMED,
        registeredAt: new Date("2026-10-22T05:00:00.000Z"),
        cancelledAt: null,
        cancelReason: null,
      }),
    });
    expect(transaction.registrationStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        registrationId: "registration-1",
        fromStatus: SupportProgramRegistrationStatus.CANCELLED,
        toStatus: SupportProgramRegistrationStatus.CONFIRMED,
      }),
    });
  });

  it("promotes the first waitlisted member when a confirmed member cancels before registration closes", async () => {
    registration.findUnique.mockResolvedValue({
      id: "registration-cancelled",
      version: 2,
      status: SupportProgramRegistrationStatus.CONFIRMED,
    });
    transaction.supportProgramRegistration.findFirst.mockResolvedValue({
      id: "registration-waitlisted",
      userId: "WAITLISTED-1",
      status: SupportProgramRegistrationStatus.WAITLISTED,
    });
    transaction.supportProgramRegistration.update
      .mockResolvedValueOnce({ id: "registration-cancelled" })
      .mockResolvedValueOnce({ id: "registration-waitlisted" });

    await service.cancel(
      { id: "MEMBER-1", role: RoleName.PATIENT, authVersion: 1 },
      "PROGRAM-1",
    );

    expect(transaction.supportProgramRegistration.findFirst).toHaveBeenCalledWith({
      where: {
        programId: "PROGRAM-1",
        status: SupportProgramRegistrationStatus.WAITLISTED,
      },
      orderBy: [{ waitlistedAt: "asc" }, { id: "asc" }],
    });
    expect(transaction.supportProgramRegistration.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: "registration-waitlisted" },
        data: expect.objectContaining({
          status: SupportProgramRegistrationStatus.CONFIRMED,
          waitlistedAt: null,
        }),
      }),
    );
    expect(transaction.registrationStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        registrationId: "registration-cancelled",
        fromStatus: SupportProgramRegistrationStatus.CONFIRMED,
        toStatus: SupportProgramRegistrationStatus.CANCELLED,
      }),
    });
    expect(transaction.registrationStatusHistory.create).toHaveBeenCalledTimes(2);
    expect(notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "WAITLISTED-1",
        kind: NotificationKind.PROGRAM_REGISTRATION_CONFIRMED,
      }),
      transaction,
    );
  });

  it("requires attendance reason and writes an audit record for attendance changes", async () => {
    const manager = {
      id: "PARTNER-1",
      role: RoleName.PARTNER,
      authVersion: 1,
    };
    user.findUnique.mockResolvedValue({
      id: "PARTNER-1",
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.PATIENT },
      partnerMembership: { status: PartnerStatus.ACTIVE },
    });
    managedResource.findUnique.mockResolvedValue({
      ...program,
      payload: { ...program.payload, status: "COMPLETED" },
    });
    registration.findUnique.mockResolvedValue({
      id: "registration-1",
      version: 1,
      status: SupportProgramRegistrationStatus.ATTENDED,
    });

    await expect(
      service.update(manager, "PROGRAM-1", "MEMBER-1", {
        status: SupportProgramRegistrationStatus.NO_SHOW,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.auditLog.create).not.toHaveBeenCalled();

    await service.update(manager, "PROGRAM-1", "MEMBER-1", {
      status: SupportProgramRegistrationStatus.NO_SHOW,
      decisionReason: "Không có mặt tại chương trình",
    });

    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "PARTNER-1",
        action: "UPDATE_REGISTRATION_ATTENDANCE",
        entityType: "SUPPORT_PROGRAM_REGISTRATION",
        entityId: "registration-1",
        before: { status: SupportProgramRegistrationStatus.ATTENDED },
        after: { status: SupportProgramRegistrationStatus.NO_SHOW },
        reason: "Không có mặt tại chương trình",
      }),
    });
  });
});
