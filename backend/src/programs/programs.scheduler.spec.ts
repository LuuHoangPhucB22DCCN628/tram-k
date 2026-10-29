import { Test, TestingModule } from "@nestjs/testing";
import { ProgramStatus, SupportProgramRegistrationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProgramsScheduler } from "./programs.scheduler";

describe("ProgramsScheduler", () => {
  let scheduler: ProgramsScheduler;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      program: {
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      programStatusHistory: { create: jest.fn() },
      supportProgramRegistration: { findMany: jest.fn(), updateMany: jest.fn() },
      registrationStatusHistory: { createMany: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProgramsScheduler, { provide: PrismaService, useValue: prisma }],
    }).compile();

    scheduler = module.get<ProgramsScheduler>(ProgramsScheduler);
    process.env.JOBS_ENABLED = "true";
  });

  it("completes expired programs and marks confirmed registrations as no-show", async () => {
    const expiredProgram = { id: "program-1", status: ProgramStatus.PUBLISHED };
    prisma.program.findMany.mockResolvedValue([expiredProgram]);
    prisma.supportProgramRegistration.findMany.mockResolvedValue([{ id: "reg-1" }]);

    await scheduler.handleProgramCompletion();

    // SỬA TẠI ĐÂY: Dùng objectContaining cho phần where để chấp nhận thêm điều kiện endAt
    expect(prisma.program.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "program-1",
          status: ProgramStatus.PUBLISHED,
        }),
        data: { status: ProgramStatus.COMPLETED },
      })
    );

    expect(prisma.supportProgramRegistration.updateMany).toHaveBeenCalled();
  });
});