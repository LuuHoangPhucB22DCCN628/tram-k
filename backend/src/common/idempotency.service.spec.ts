import { ConflictException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { IdempotencyService } from "./idempotency.service";

describe("IdempotencyService", () => {
  const prisma = {
    idempotencyRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  } as unknown as PrismaService;

  const service = new IdempotencyService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it("hashes the same payload consistently", () => {
    expect(service.hashPayload({ a: 1 })).toBe(service.hashPayload({ a: 1 }));
    expect(service.hashPayload({ a: 1 })).not.toBe(service.hashPayload({ a: 2 }));
  });

  it("returns null when no record exists", async () => {
    (prisma.idempotencyRecord.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      service.validateOrThrow("user:1", "CREATE_POST", "key-1", "hash-a"),
    ).resolves.toBeNull();
  });

  it("replays a matching unexpired record", async () => {
    const existing = {
      payloadHash: "hash-a",
      expiresAt: new Date(Date.now() + 60_000),
      responseBody: { success: true },
      responseStatus: 201,
    };
    (prisma.idempotencyRecord.findUnique as jest.Mock).mockResolvedValue(existing);

    await expect(
      service.validateOrThrow("user:1", "CREATE_POST", "key-1", "hash-a"),
    ).resolves.toBe(existing);
  });

  it("deletes an expired record and treats the key as unused", async () => {
    (prisma.idempotencyRecord.findUnique as jest.Mock).mockResolvedValue({
      payloadHash: "hash-a",
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      service.validateOrThrow("user:1", "CREATE_POST", "key-1", "hash-a"),
    ).resolves.toBeNull();
    expect(prisma.idempotencyRecord.delete).toHaveBeenCalled();
  });

  it("rejects reuse of the same key with a different payload", async () => {
    (prisma.idempotencyRecord.findUnique as jest.Mock).mockResolvedValue({
      payloadHash: "hash-a",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.validateOrThrow("user:1", "CREATE_POST", "key-1", "hash-b"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("persists a 24-hour idempotency record", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-29T00:00:00.000Z"));
    (prisma.idempotencyRecord.create as jest.Mock).mockResolvedValue({ id: "rec-1" });

    await service.saveRecord(
      "user:1",
      "CREATE_POST",
      "key-1",
      "hash-a",
      201,
      { success: true },
    );

    expect(prisma.idempotencyRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorScope: "user:1",
        operation: "CREATE_POST",
        key: "key-1",
        payloadHash: "hash-a",
        responseStatus: 201,
        expiresAt: new Date("2026-10-30T00:00:00.000Z"),
      }),
    });
    jest.useRealTimers();
  });
});
