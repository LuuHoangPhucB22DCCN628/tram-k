import { Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

jest.mock("@nestjs/schedule", () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_DAY_AT_2AM: "0 2 * * *" },
}));

import { NotificationCleanupService } from "./notification-cleanup.service";

describe("NotificationCleanupService", () => {
  const deleteMany = jest.fn();
  const prisma = {
    notification: { deleteMany },
  } as unknown as PrismaService;
  let service: NotificationCleanupService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationCleanupService(prisma);
    deleteMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => jest.useRealTimers());

  it("deletes notifications older than 90 days and preserves newer ones", async () => {
    const now = new Date("2026-10-23T04:00:00.000Z");
    jest.useFakeTimers().setSystemTime(now);

    await service.cleanupOldNotifications();

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 90);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: cutoff } },
    });
  });

  it("logs cleanup failures instead of silently swallowing them", async () => {
    const loggerError = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    deleteMany.mockRejectedValue(new Error("database unavailable"));

    await expect(service.cleanupOldNotifications()).resolves.toBeUndefined();
    expect(loggerError).toHaveBeenCalled();
  });
});
