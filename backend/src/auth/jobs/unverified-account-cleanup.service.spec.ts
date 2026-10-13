import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { UnverifiedAccountCleanupService } from "./unverified-account-cleanup.service";

describe("UnverifiedAccountCleanupService", () => {
  it("soft-deletes expired pending accounts and revokes their credentials", async () => {
    const prismaMock = {
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: "user-1" }]),
        update: jest.fn().mockResolvedValue({}),
      },
      authToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      authSession: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
    };
    const configMock = { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    const cleanup = new UnverifiedAccountCleanupService(
      prismaMock as unknown as PrismaService,
      configMock as unknown as ConfigService,
    );

    await expect(cleanup.cleanupExpired()).resolves.toBe(1);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        verificationCleanupAt: null,
        authVersion: { increment: 1 },
      }),
    });
    expect(prismaMock.authToken.updateMany).toHaveBeenCalled();
    expect(prismaMock.authSession.updateMany).toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });
});
