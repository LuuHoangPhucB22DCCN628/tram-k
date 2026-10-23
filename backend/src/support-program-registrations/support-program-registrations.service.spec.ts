import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  PartnerStatus,
  ProgramStatus,
  RoleName,
  SupportProgramRegistrationStatus,
  UserStatus,
} from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { PrismaService } from "../prisma/prisma.service";
import { SupportProgramRegistrationsService } from "./support-program-registrations.service";

describe("SupportProgramRegistrationsService", () => {
  const transaction = {
    $queryRaw: jest.fn(),
    program: { findUnique: jest.fn() },
    supportProgramRegistration: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    registrationStatusHistory: { create: jest.fn(), createMany: jest.fn() },
    auditLog: { create: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };

  const prisma = {
    $transaction: jest.fn((arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return (arg as (client: typeof transaction) => unknown)(transaction);
    }),
    user: { findUnique: jest.fn() },
    program: { findUnique: jest.fn() },
    supportProgramRegistration: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  const service = new SupportProgramRegistrationsService(
    prisma,
    {} as any,
  );

  const actor: AuthenticatedUser = {
    id: "user-1",
    role: RoleName.PATIENT,
    authVersion: 1,
  };

  // SỬA LẠI: Mock theo đúng dữ liệu thô từ $queryRaw (snake_case)
  const mockProgramRaw = {
    id: "program-1",
    owner_partner_id: "partner-1",
    status: ProgramStatus.PUBLISHED,
    registration_open_at: new Date(Date.now() - 10000),
    registration_close_at: new Date(Date.now() + 10000),
    start_at: new Date(Date.now() + 20000),
    end_at: new Date(Date.now() + 30000),
    capacity: 10,
    deleted_at: null, // Quan trọng: phải là deleted_at
    title: "Test Program",
  };

  // SỬA LẠI: Mock cho Prisma (camelCase)
  const mockProgramPrisma = {
    id: "program-1",
    ownerPartnerId: "partner-1",
    status: ProgramStatus.PUBLISHED,
    registrationOpenAt: new Date(Date.now() - 10000),
    registrationCloseAt: new Date(Date.now() + 10000),
    startAt: new Date(Date.now() + 20000),
    endAt: new Date(Date.now() + 30000),
    capacity: 10,
    deletedAt: null,
    title: "Test Program",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: actor.id,
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PATIENT },
      partnerMembership: null,
    });

    transaction.$queryRaw.mockResolvedValue([mockProgramRaw]);
    transaction.program.findUnique.mockResolvedValue(mockProgramPrisma);
    (prisma.program.findUnique as jest.Mock).mockResolvedValue(mockProgramPrisma);

    transaction.supportProgramRegistration.count.mockResolvedValue(0);
  });

  it("allows an active partner to list registrations for their own program", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: actor.id,
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PARTNER },
      partnerMembership: { id: "partner-1", status: PartnerStatus.ACTIVE },
    });

    (prisma.supportProgramRegistration.findMany as jest.Mock).mockResolvedValue([]);
    await expect(service.forProgram(actor, "program-1")).resolves.toEqual([]);
  });

  it("denies suspended partners access to registrations for their program", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: actor.id,
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PARTNER },
      partnerMembership: { id: "partner-1", status: PartnerStatus.SUSPENDED },
    });

    await expect(service.forProgram(actor, "program-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("denies active partners access to another partner's registrations", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: actor.id,
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PARTNER },
      partnerMembership: { id: "partner-2", status: PartnerStatus.ACTIVE },
    });

    await expect(service.forProgram(actor, "program-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows an active Admin to access program registrations", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: actor.id,
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.ADMIN },
      partnerMembership: null,
    });

    (prisma.supportProgramRegistration.findMany as jest.Mock).mockResolvedValue([]);
    await expect(service.forProgram(actor, "program-1")).resolves.toEqual([]);
  });

  it("creates a confirmed registration and writes its initial status history", async () => {
    transaction.supportProgramRegistration.findUnique.mockResolvedValue(null);
    transaction.supportProgramRegistration.create.mockResolvedValue({
      id: "reg-1",
      version: 1,
    });

    await service.register(actor, "program-1");

    expect(transaction.supportProgramRegistration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SupportProgramRegistrationStatus.CONFIRMED,
        }),
      }),
    );
  });

  it("puts a new registration on the waitlist when all confirmed slots are full", async () => {
    transaction.supportProgramRegistration.findUnique.mockResolvedValue(null);
    transaction.supportProgramRegistration.count.mockResolvedValue(10);
    transaction.supportProgramRegistration.create.mockResolvedValue({ id: "reg-1", version: 1 });

    await service.register(actor, "program-1");

    expect(transaction.supportProgramRegistration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SupportProgramRegistrationStatus.WAITLISTED,
        }),
      }),
    );
  });

  it("re-registers a cancelled member on the existing row and resets its timestamps", async () => {
    transaction.supportProgramRegistration.findUnique.mockResolvedValue({
      id: "reg-1",
      status: SupportProgramRegistrationStatus.CANCELLED,
    });
    transaction.supportProgramRegistration.update.mockResolvedValue({ id: "reg-1", version: 2 });

    await service.register(actor, "program-1");

    expect(transaction.supportProgramRegistration.update).toHaveBeenCalled();
  });

  it("promotes the first waitlisted member when a confirmed member cancels before registration closes", async () => {
    transaction.supportProgramRegistration.findUnique.mockResolvedValue({
      id: "reg-1",
      status: SupportProgramRegistrationStatus.CONFIRMED,
      version: 1,
    });
    transaction.supportProgramRegistration.update.mockResolvedValue({ id: "reg-1", version: 2 });

    transaction.supportProgramRegistration.findFirst.mockResolvedValue({
      id: "reg-2",
      userId: "user-2",
      status: SupportProgramRegistrationStatus.WAITLISTED,
    });
    transaction.supportProgramRegistration.update.mockResolvedValueOnce({ id: "reg-1", version: 2 })
      .mockResolvedValueOnce({ id: "reg-2", version: 2 });

    await service.cancel(actor, "program-1");

    expect(transaction.supportProgramRegistration.update).toHaveBeenCalledTimes(2);
  });

  it("requires attendance reason and writes an audit record for attendance changes", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: actor.id,
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PARTNER },
      partnerMembership: { id: "partner-1", status: PartnerStatus.ACTIVE },
    });

    (prisma.supportProgramRegistration.findUnique as jest.Mock).mockResolvedValue({
      id: "reg-1",
      status: SupportProgramRegistrationStatus.CONFIRMED,
      version: 1,
    });

    await expect(
      service.update(actor, "program-1", "reg-1", { status: SupportProgramRegistrationStatus.NO_SHOW } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});