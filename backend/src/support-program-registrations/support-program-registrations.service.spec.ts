import { ForbiddenException } from "@nestjs/common";
import {
  PartnerStatus,
  RoleName,
  SearchDocumentType,
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
    payload: { ownerId: "PARTNER-1", capacity: 10 },
  };
  const registration = { findMany: jest.fn() };
  const managedResource = { findUnique: jest.fn() };
  const user = { findUnique: jest.fn() };
  const prisma = {
    supportProgramRegistration: registration,
    managedResource,
    user,
  } as unknown as PrismaService;
  const notifications = {} as NotificationsService;
  const service = new SupportProgramRegistrationsService(prisma, notifications);

  beforeEach(() => {
    jest.clearAllMocks();
    managedResource.findUnique.mockResolvedValue(program);
    registration.findMany.mockResolvedValue([{ id: "registration-1" }]);
    user.findUnique.mockResolvedValue({
      id: "PARTNER-1",
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.PATIENT },
      partnerMembership: {
        id: "membership-1",
        status: PartnerStatus.ACTIVE,
      },
    });
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
      payload: { ownerId: "PARTNER-2", capacity: 10 },
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
});
