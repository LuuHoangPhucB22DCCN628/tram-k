import { ContentStatus } from "@prisma/client";

jest.mock("@nestjs/schedule", () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_MINUTE: "* * * * *" },
}));

import { PrismaService } from "../prisma/prisma.service";
import { ContentsScheduler } from "./contents.scheduler";

describe("ContentsScheduler", () => {
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof prisma) => unknown) =>
      callback(prisma),
    ),
    content: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  } as unknown as PrismaService;

  const scheduler = new ContentsScheduler(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.JOBS_ENABLED;
    (prisma.content.update as jest.Mock).mockResolvedValue({});
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it("skips work when JOBS_ENABLED is false", async () => {
    process.env.JOBS_ENABLED = "false";
    await scheduler.handleScheduledPublish();
    expect(prisma.content.findMany).not.toHaveBeenCalled();
  });

  it("publishes due content that still has a valid medical review", async () => {
    const now = new Date("2026-10-20T00:00:00.000Z");
    jest.useFakeTimers().setSystemTime(now);
    (prisma.content.findMany as jest.Mock).mockResolvedValue([
      {
        id: "content-1",
        sourceId: "source-1",
        reviewedAt: new Date("2026-09-01T00:00:00.000Z"),
        nextReviewAt: new Date("2027-01-01T00:00:00.000Z"),
      },
    ]);

    await scheduler.handleScheduledPublish();

    expect(prisma.content.update).toHaveBeenCalledWith({
      where: { id: "content-1" },
      data: expect.objectContaining({ status: ContentStatus.PUBLISHED }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "SCHEDULED_PUBLISH_SUCCESS" }),
    });
    jest.useRealTimers();
  });

  it("rolls content back to draft when the medical review has expired", async () => {
    const now = new Date("2026-10-20T00:00:00.000Z");
    jest.useFakeTimers().setSystemTime(now);
    (prisma.content.findMany as jest.Mock).mockResolvedValue([
      {
        id: "content-1",
        sourceId: null,
        reviewedAt: null,
        nextReviewAt: null,
      },
    ]);

    await scheduler.handleScheduledPublish();

    expect(prisma.content.update).toHaveBeenCalledWith({
      where: { id: "content-1" },
      data: expect.objectContaining({ status: ContentStatus.DRAFT }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "FAILED_SCHEDULED_PUBLISH" }),
    });
    jest.useRealTimers();
  });
});
