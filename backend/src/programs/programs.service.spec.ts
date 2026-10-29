import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PartnerStatus, ProgramStatus, RoleName, UserStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { PrismaService } from "../prisma/prisma.service";
import { ReviewDecision } from "./dto/review-program.dto";
import { ProgramsService } from "./programs.service";

describe("ProgramsService", () => {
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof prisma) => unknown) =>
      callback(prisma),
    ),
    user: { findUnique: jest.fn() },
    program: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    programStatusHistory: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    outboxEvent: { create: jest.fn() },
  } as unknown as PrismaService;

  const service = new ProgramsService(prisma);
  const partner: AuthenticatedUser = { id: "user-1", role: RoleName.PARTNER, authVersion: 1 };
  const admin: AuthenticatedUser = { id: "admin-1", role: RoleName.ADMIN, authVersion: 1 };
  const dto = {
    title: "Chiến dịch hiến máu nhân đạo",
    description: "Chi tiết chương trình hỗ trợ bệnh nhân đủ dài để vượt ngưỡng tối thiểu của hệ thống.",
    address: "Số 1 Trần Phú",
    latitude: 21.02,
    longitude: 105.84,
    registrationOpenAt: "2026-11-01T00:00:00.000Z",
    registrationCloseAt: "2026-11-10T00:00:00.000Z",
    startAt: "2026-11-11T00:00:00.000Z",
    endAt: "2026-11-12T00:00:00.000Z",
    capacity: 50,
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
    (prisma.program.create as jest.Mock).mockResolvedValue({ id: "program-1", ownerPartnerId: "partner-1", status: ProgramStatus.DRAFT });
    (prisma.program.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.programStatusHistory.create as jest.Mock).mockResolvedValue({});
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
    (prisma.outboxEvent.create as jest.Mock).mockResolvedValue({});
  });

  it("creates a draft program owned by the active partner", async () => {
    const program = await service.create(partner, dto);
    expect(program.ownerPartnerId).toBe("partner-1");
  });

  it("rejects an invalid registration timeline", async () => {
    await expect(
      service.create(partner, { ...dto, registrationCloseAt: "2026-11-20T00:00:00.000Z" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("forbids a suspended partner from creating a program", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ partnerMembership: { id: "partner-1", status: PartnerStatus.SUSPENDED } });
    await expect(service.create(partner, dto)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("submits a draft owned by the same partner", async () => {
    (prisma.program.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: "program-1", ownerPartnerId: "partner-1", status: ProgramStatus.DRAFT })
      .mockResolvedValueOnce({ id: "program-1", status: ProgramStatus.PENDING });

    const updated = await service.submit(partner, "program-1");
    expect(updated!.status).toBe(ProgramStatus.PENDING);
  });

  it("forbids submitting a program owned by another partner", async () => {
    (prisma.program.findUnique as jest.Mock).mockResolvedValue({ id: "program-1", ownerPartnerId: "partner-other", status: ProgramStatus.DRAFT });
    await expect(service.submit(partner, "program-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("returns 404 when submitting a missing program", async () => {
    (prisma.program.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.submit(partner, "missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("approves a pending program with audit and outbox", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: { name: RoleName.ADMIN } });
    (prisma.program.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: "program-1", status: ProgramStatus.PENDING, title: "T", ownerPartnerId: "partner-1" })
      .mockResolvedValueOnce({ id: "program-1", status: ProgramStatus.PUBLISHED });

    const updated = await service.review(admin, "program-1", { decision: ReviewDecision.APPROVE });
    expect(updated!.status).toBe(ProgramStatus.PUBLISHED);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "APPROVE_PROGRAM" }) });
    // SỬA: Đổi thành PROGRAM_PUBLISHED cho đúng code Production mới
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: "PROGRAM_PUBLISHED" }) });
  });

  it("requires a reject reason of at least 10 characters", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: { name: RoleName.ADMIN } });
    (prisma.program.findUnique as jest.Mock).mockResolvedValue({ id: "program-1", status: ProgramStatus.PENDING });
    await expect(
      service.review(admin, "program-1", { decision: ReviewDecision.REJECT, reason: "ngắn" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});