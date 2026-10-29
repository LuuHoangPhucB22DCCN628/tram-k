import { ForbiddenException } from "@nestjs/common";
import { RoleName, UserStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "./audit-logs.service";

describe("AuditLogsService", () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  } as unknown as PrismaService;

  const service = new AuditLogsService(prisma);
  const admin: AuthenticatedUser = {
    id: "admin-1",
    role: RoleName.ADMIN,
    authVersion: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "admin-1",
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.ADMIN },
    });
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([
      { id: "audit-1", action: "APPROVE_POST" },
    ]);
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(21);
  });

  it("lists filtered audit logs for an active admin", async () => {
    const result = await service.list(admin, {
      page: 2,
      limit: 20,
      actorType: "USER",
      entityType: "POST",
      entityId: "post-1",
      action: "APPROVE_POST",
      correlationId: "corr-1",
      fromDate: "2026-10-01T00:00:00.000Z",
      toDate: "2026-10-31T00:00:00.000Z",
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: {
        actorType: "USER",
        entityType: "POST",
        entityId: "post-1",
        action: "APPROVE_POST",
        correlationId: "corr-1",
        occurredAt: {
          gte: new Date("2026-10-01T00:00:00.000Z"),
          lte: new Date("2026-10-31T00:00:00.000Z"),
        },
      },
      orderBy: { occurredAt: "desc" },
      skip: 20,
      take: 20,
    });
    expect(result).toEqual({
      items: [{ id: "audit-1", action: "APPROVE_POST" }],
      total: 21,
      page: 2,
      limit: 20,
      totalPages: 2,
    });
  });

  it("forbids an inactive admin from reading audit logs", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "admin-1",
      status: UserStatus.LOCKED,
      deletedAt: null,
      role: { name: RoleName.ADMIN },
    });

    await expect(service.list(admin, { page: 1, limit: 20 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("forbids a non-admin from reading audit logs", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PATIENT },
    });

    await expect(
      service.list(
        { id: "user-1", role: RoleName.PATIENT, authVersion: 1 },
        { page: 1, limit: 20 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
