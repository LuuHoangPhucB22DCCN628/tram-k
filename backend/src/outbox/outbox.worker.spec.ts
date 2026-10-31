import { NotificationKind, OutboxStatus } from "@prisma/client";

import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

jest.mock("@nestjs/schedule", () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_10_SECONDS: "*/10 * * * * *" },
}));

import { OutboxWorker } from "./outbox.worker";

describe("OutboxWorker", () => {
  const outboxEvent = {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  };
  const prisma = { outboxEvent } as unknown as PrismaService;
  const notificationCreate = jest.fn();
  const notifications = {
    create: notificationCreate,
  } as unknown as NotificationsService;
  let worker: OutboxWorker;

  const makeEvent = (overrides: Record<string, unknown> = {}) => ({
    id: "event-1",
    eventId: "event-uuid-1",
    type: "PROGRAM_REGISTRATION_CONFIRMED",
    aggregateType: "SupportProgramRegistration",
    aggregateId: "registration-1",
    payload: {
      recipientId: "member-1",
      programId: "program-1",
      programTitle: "Chương trình hỗ trợ",
      registrationVersion: 3,
    },
    status: OutboxStatus.PENDING,
    attempts: 0,
    availableAt: new Date("2026-10-22T00:00:00.000Z"),
    updatedAt: new Date("2026-10-22T00:00:00.000Z"),
    createdAt: new Date("2026-10-22T00:00:00.000Z"),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    worker = new OutboxWorker(prisma, notifications);
    outboxEvent.findMany.mockResolvedValue([]);
    outboxEvent.updateMany.mockResolvedValue({ count: 1 });
    outboxEvent.update.mockResolvedValue({});
    notificationCreate.mockResolvedValue({ id: "notification-1" });
  });

  it("selects all supported application and registration event types", async () => {
    await worker.processOutboxEvents();

    const query = outboxEvent.findMany.mock.calls[0][0];
    expect(query.where.type.in).toEqual(
      expect.arrayContaining([
        "PARTNER_APPLICATION_REVIEWED",
        "PROGRAM_REGISTRATION_SENT",
        "PROGRAM_REGISTRATION_CONFIRMED",
      ]),
    );
  });

  it("recovers processing events based on their last update time", async () => {
    await worker.processOutboxEvents();

    const query = outboxEvent.findMany.mock.calls[0][0];
    expect(query.where.OR).toContainEqual(
      expect.objectContaining({
        status: OutboxStatus.PROCESSING,
        updatedAt: { lt: expect.any(Date) },
      }),
    );
  });

  it("claims a promoted registration and creates an idempotent notification", async () => {
    outboxEvent.findMany.mockResolvedValue([makeEvent()]);

    await worker.processOutboxEvents();

    expect(outboxEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "event-1",
          status: OutboxStatus.PENDING,
        }),
        data: expect.objectContaining({
          status: OutboxStatus.PROCESSING,
          attempts: { increment: 1 },
        }),
      }),
    );
    expect(notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "member-1",
        kind: NotificationKind.PROGRAM_REGISTRATION_CONFIRMED,
        dedupeKey: "program-registration:registration-1:promoted:v3",
      }),
    );
    expect(outboxEvent.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: expect.objectContaining({
        status: OutboxStatus.SENT,
        sentAt: expect.any(Date),
      }),
    });
  });

  it("does not process an event when another worker already claimed it", async () => {
    outboxEvent.findMany.mockResolvedValue([makeEvent()]);
    outboxEvent.updateMany.mockResolvedValue({ count: 0 });

    await worker.processOutboxEvents();

    expect(notificationCreate).not.toHaveBeenCalled();
    expect(outboxEvent.update).not.toHaveBeenCalled();
  });

  it("schedules a failed event for exponential retry", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-23T00:00:00.000Z"));
    outboxEvent.findMany.mockResolvedValue([
      makeEvent({ attempts: 1 }),
    ]);
    notificationCreate.mockRejectedValue(new Error("notification storage unavailable"));

    await worker.processOutboxEvents();

    const retryUpdate = outboxEvent.update.mock.calls[0][0];
    expect(retryUpdate.data.status).toBe(OutboxStatus.PENDING);
    expect(retryUpdate.data.lastError).toBe(
      "notification storage unavailable",
    );
    expect(retryUpdate.data.availableAt).toEqual(
      new Date("2026-10-23T00:01:00.000Z"),
    );
    jest.useRealTimers();
  });
});
