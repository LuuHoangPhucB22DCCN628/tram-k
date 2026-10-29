import { ProgramStatus, SupportProgramRegistrationStatus } from "@prisma/client";

jest.mock("@nestjs/schedule", () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_MINUTE: "* * * * *" },
}));

import { PrismaService } from "../prisma/prisma.service";
import { ProgramsScheduler } from "./programs.scheduler";

describe("ProgramsScheduler", () => {
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof prisma) => unknown) =>
      callback(prisma),
    ),
    program: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    programStatusHistory: { create: jest.fn() },
    supportProgramRegistration: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    registrationStatusHistory: { createMany: jest.fn() },
    auditLog: { create: jest.fn() },
  } as unknown as PrismaService;

  const scheduler = new ProgramsScheduler(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.JOBS_ENABLED;
    (prisma.program.findMany as jest.Mock).mockResolvedValue([{ id: "program-1" }]);
    (prisma.program.update as jest.Mock).mockResolvedValue({
      id: "program-1",
      status: ProgramStatus.COMPLETED,
    });
    (prisma.supportProgramRegistration.findMany as jest.Mock).mockResolvedValue([
      { id: "reg-1" },
    ]);
    (prisma.supportProgramRegistration.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (prisma.programStatusHistory.create as jest.Mock).mockResolvedValue({});
    (prisma.registrationStatusHistory.createMany as jest.Mock).mockResolvedValue({});
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it("skips work when JOBS_ENABLED is false", async () => {
    process.env.JOBS_ENABLED = "false";
    await scheduler.handleProgramCompletion();
    expect(prisma.program.findMany).not.toHaveBeenCalled();
  });

  it("completes expired programs and marks confirmed registrations as no-show", async () => {
    await scheduler.handleProgramCompletion();

    expect(prisma.program.update).toHaveBeenCalledWith({
      where: { id: "program-1" },
      data: { status: ProgramStatus.COMPLETED },
    });
    expect(prisma.supportProgramRegistration.updateMany).toHaveBeenCalledWith({
      where: {
        programId: "program-1",
        status: SupportProgramRegistrationStatus.CONFIRMED,
      },
      data: expect.objectContaining({
        status: SupportProgramRegistrationStatus.NO_SHOW,
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: "SYSTEM",
        action: "COMPLETE_PROGRAM",
      }),
    });
  });

  it("returns early when there is no expired program", async () => {
    (prisma.program.findMany as jest.Mock).mockResolvedValue([]);
    await scheduler.handleProgramCompletion();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
