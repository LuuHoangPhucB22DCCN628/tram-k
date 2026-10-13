import { ConfigService } from "@nestjs/config";
import { OutboxStatus } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthOutboxCryptoService } from "../auth-outbox-crypto.service";
import { AuthOutboxWorker } from "./auth-outbox.worker";
import { VerificationEmailDeliveryService } from "./verification-email-delivery.service";

interface HarnessOptions {
  readonly id?: string;
  readonly type?: string;
  readonly attempts?: number;
  readonly recipient?: string;
  readonly deliveryError?: Error;
}

function createHarness(options: HarnessOptions = {}) {
  const event = {
    id: options.id ?? "event-1",
    type: options.type ?? "AUTH_EMAIL_VERIFICATION_REQUESTED",
    status: OutboxStatus.PENDING,
    attempts: options.attempts ?? 0,
    updatedAt: new Date(),
    payload: {
      recipient: options.recipient ?? "member@example.com",
      displayName: "Nguyễn An",
      encryptedToken: "encrypted-token",
    },
  };
  const prismaMock = {
    outboxEvent: {
      findMany: jest.fn().mockResolvedValue([event]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const cryptoMock = { decrypt: jest.fn().mockReturnValue("raw-token") };
  const delivery = options.deliveryError
    ? jest.fn().mockRejectedValue(options.deliveryError)
    : jest.fn().mockResolvedValue(undefined);
  const emailMock = {
    sendVerification: delivery,
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendEmailChange: jest.fn().mockResolvedValue(undefined),
  };
  const configMock = {
    get: jest.fn((_key: string, fallback: unknown) => fallback),
  };
  const worker = new AuthOutboxWorker(
    prismaMock as unknown as PrismaService,
    cryptoMock as unknown as AuthOutboxCryptoService,
    emailMock as unknown as VerificationEmailDeliveryService,
    configMock as unknown as ConfigService,
  );
  return { worker, prismaMock, emailMock };
}

describe("AuthOutboxWorker", () => {
  it("claims, decrypts and marks a verification email as sent", async () => {
    const { worker, prismaMock, emailMock } = createHarness();

    await expect(worker.processBatch()).resolves.toBe(1);
    expect(emailMock.sendVerification).toHaveBeenCalledWith({
      recipient: "member@example.com",
      displayName: "Nguyễn An",
      token: "raw-token",
    });
    expect(prismaMock.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: {
        status: OutboxStatus.SENT,
        sentAt: expect.any(Date),
        lastError: null,
      },
    });
  });

  it("routes password-reset events to the reset email template", async () => {
    const { worker, emailMock } = createHarness({
      id: "event-reset",
      type: "AUTH_PASSWORD_RESET_REQUESTED",
    });

    await expect(worker.processBatch()).resolves.toBe(1);
    expect(emailMock.sendPasswordReset).toHaveBeenCalledWith({
      recipient: "member@example.com",
      displayName: "Nguyễn An",
      token: "raw-token",
    });
    expect(emailMock.sendVerification).not.toHaveBeenCalled();
  });

  it("routes email-change events to the email-change template", async () => {
    const { worker, emailMock } = createHarness({
      id: "event-email-change",
      type: "AUTH_EMAIL_CHANGE_REQUESTED",
      recipient: "new@example.com",
    });

    await expect(worker.processBatch()).resolves.toBe(1);
    expect(emailMock.sendEmailChange).toHaveBeenCalledWith({
      recipient: "new@example.com",
      displayName: "Nguyễn An",
      token: "raw-token",
    });
    expect(emailMock.sendVerification).not.toHaveBeenCalled();
    expect(emailMock.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("reschedules a provider failure with exponential backoff", async () => {
    const { worker, prismaMock } = createHarness({
      deliveryError: new Error("provider timeout"),
    });

    await expect(worker.processBatch()).resolves.toBe(0);
    expect(prismaMock.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: {
        status: OutboxStatus.PENDING,
        availableAt: expect.any(Date),
        lastError: "provider timeout",
      },
    });
  });

  it("marks the event as failed after the fifth delivery attempt", async () => {
    const { worker, prismaMock } = createHarness({
      attempts: 4,
      deliveryError: new Error("provider unavailable"),
    });

    await expect(worker.processBatch()).resolves.toBe(0);
    expect(prismaMock.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: {
        status: OutboxStatus.FAILED,
        availableAt: expect.any(Date),
        lastError: "provider unavailable",
      },
    });
  });
});
