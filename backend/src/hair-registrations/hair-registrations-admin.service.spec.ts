import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { HairRegistrationStatus, RoleName } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { HairRegistrationsService } from "./hair-registrations.service";

describe("HairRegistrationsService admin operations", () => {
  const admin = { id: "admin-1", role: RoleName.ADMIN, authVersion: 1 };
  const member = { id: "member-1", role: RoleName.PATIENT, authVersion: 1 };
  const findUnique = jest.fn();
  const findUniqueOrThrow = jest.fn();
  const updateMany = jest.fn();
  const auditCreate = jest.fn();
  const notify = jest.fn();
  const transaction = jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      hairRegistration: { findUnique, findUniqueOrThrow, updateMany },
      auditLog: { create: auditCreate },
    }),
  );
  const prisma = {
    hairRegistration: { findUnique },
    auditLog: { findMany: jest.fn() },
    $transaction: transaction,
  } as unknown as PrismaService;
  const service = new HairRegistrationsService(prisma, {
    create: notify,
  } as unknown as NotificationsService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("denies members access before reading private registrations", async () => {
    await expect(service.listForAdmin(member, { page: 1, limit: 20 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.detailForAdmin(member, "hair-1")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.reviewForAdmin(member, "hair-1", {
        status: HairRegistrationStatus.APPROVED,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("approves a pending registration and records the transition", async () => {
    findUnique.mockResolvedValue({
      id: "hair-1",
      userId: "member-1",
      reference: "TK-TEST-0001",
      mode: "RECEIVE",
      status: HairRegistrationStatus.PENDING,
    });
    updateMany.mockResolvedValue({ count: 1 });
    findUniqueOrThrow.mockResolvedValue({
      id: "hair-1",
      status: HairRegistrationStatus.APPROVED,
    });

    await expect(
      service.reviewForAdmin(admin, "hair-1", {
        status: HairRegistrationStatus.APPROVED,
      }),
    ).resolves.toMatchObject({ status: HairRegistrationStatus.APPROVED });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "hair-1", status: HairRegistrationStatus.PENDING },
      data: { status: HairRegistrationStatus.APPROVED },
    });
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: admin.id,
          before: { status: HairRegistrationStatus.PENDING },
          after: { status: HairRegistrationStatus.APPROVED },
        }),
      }),
    );
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "member-1",
        kind: "HAIR_REGISTRATION_APPROVED",
        link: "/tra-cuu-ma?ma=TK-TEST-0001",
        message: expect.stringContaining("TK-TEST-0001"),
      }),
      expect.anything(),
    );
  });

  it("notifies the owner of a rejection with the reason, but never notifies an anonymous registrant", async () => {
    findUnique
      .mockResolvedValueOnce({
        id: "hair-1",
        userId: "member-1",
        reference: "TK-TEST-0001",
        mode: "DONATE",
        status: HairRegistrationStatus.PENDING,
      })
      .mockResolvedValueOnce({
        id: "hair-2",
        userId: null,
        reference: "TK-TEST-0002",
        mode: "RECEIVE",
        status: HairRegistrationStatus.PENDING,
      });
    updateMany.mockResolvedValue({ count: 1 });
    findUniqueOrThrow.mockResolvedValue({ status: HairRegistrationStatus.REJECTED });

    await service.reviewForAdmin(admin, "hair-1", {
      status: HairRegistrationStatus.REJECTED,
      reason: "Thiếu thông tin liên hệ cần thiết.",
    });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "HAIR_REGISTRATION_REJECTED",
        message: expect.stringContaining("Thiếu thông tin liên hệ cần thiết."),
      }),
      expect.anything(),
    );

    await service.reviewForAdmin(admin, "hair-2", {
      status: HairRegistrationStatus.REJECTED,
      reason: "Thiếu thông tin liên hệ cần thiết.",
    });
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("notifies the owner when an approved request is completed", async () => {
    findUnique.mockResolvedValue({
      id: "hair-1",
      userId: "member-1",
      reference: "TK-TEST-0001",
      mode: "RECEIVE",
      status: HairRegistrationStatus.APPROVED,
    });
    updateMany.mockResolvedValue({ count: 1 });
    findUniqueOrThrow.mockResolvedValue({ status: HairRegistrationStatus.COMPLETED });

    await service.reviewForAdmin(admin, "hair-1", {
      status: HairRegistrationStatus.COMPLETED,
    });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "HAIR_REGISTRATION_COMPLETED" }),
      expect.anything(),
    );
  });

  it("requires a meaningful rejection reason", async () => {
    await expect(
      service.reviewForAdmin(admin, "hair-1", {
        status: HairRegistrationStatus.REJECTED,
        reason: "ngắn",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("allows completion only after approval", async () => {
    findUnique.mockResolvedValue({
      id: "hair-1",
      status: HairRegistrationStatus.PENDING,
    });
    await expect(
      service.reviewForAdmin(admin, "hair-1", {
        status: HairRegistrationStatus.COMPLETED,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects stale transitions and unknown registration IDs", async () => {
    findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "hair-1",
      status: HairRegistrationStatus.PENDING,
    });
    await expect(
      service.reviewForAdmin(admin, "missing", {
        status: HairRegistrationStatus.APPROVED,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.reviewForAdmin(admin, "hair-1", {
        status: HairRegistrationStatus.APPROVED,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(auditCreate).not.toHaveBeenCalled();
  });
});
