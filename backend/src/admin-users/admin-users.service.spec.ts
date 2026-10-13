import { ForbiddenException } from "@nestjs/common";
import { RoleName, UserStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { AdminUsersService } from "./admin-users.service";

const activeAdmin = {
  id: "admin-1",
  email: "admin@tramk.vn",
  fullName: "Admin Trạm K",
  status: UserStatus.ACTIVE,
  authVersion: 2,
  deletedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  role: { name: RoleName.ADMIN },
  partnerMembership: null,
};

const activePatient = {
  id: "user-1",
  email: "member@example.com",
  fullName: "Nguyễn An",
  status: UserStatus.ACTIVE,
  authVersion: 3,
  deletedAt: null,
  createdAt: new Date("2026-02-01T00:00:00.000Z"),
  role: { name: RoleName.PATIENT },
  partnerMembership: null,
};

describe("AdminUsersService", () => {
  const transaction = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    authSession: { updateMany: jest.fn() },
    authToken: { updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
    outboxEvent: { create: jest.fn() },
  };
  const prismaMock = {
    $transaction: jest.fn(
      (operation: (client: typeof transaction) => unknown) =>
        operation(transaction),
    ),
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
  const service = new AdminUsersService(prismaMock as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue(activeAdmin);
    prismaMock.user.findMany.mockResolvedValue([activePatient]);
    prismaMock.user.count.mockResolvedValue(1);
    transaction.user.updateMany.mockResolvedValue({ count: 1 });
    transaction.user.count.mockResolvedValue(2);
    transaction.authSession.updateMany.mockResolvedValue({ count: 1 });
    transaction.authToken.updateMany.mockResolvedValue({ count: 1 });
    transaction.auditLog.create.mockResolvedValue({});
    transaction.outboxEvent.create.mockResolvedValue({});
  });

  it("lists non-deleted accounts for an active Admin", async () => {
    const result = await service.list("admin-1", { page: 1, limit: 20 });

    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: "user-1",
        role: RoleName.PATIENT,
        status: UserStatus.ACTIVE,
        authVersion: 3,
      }),
    );
  });

  it("locks an account, increments authVersion and revokes every refresh session", async () => {
    const locked = {
      ...activePatient,
      status: UserStatus.LOCKED,
      authVersion: 4,
    };
    transaction.user.findUnique
      .mockResolvedValueOnce(activeAdmin)
      .mockResolvedValueOnce(activePatient)
      .mockResolvedValueOnce(locked);

    const result = await service.updateStatus("admin-1", "user-1", {
      expectedStatus: UserStatus.ACTIVE,
      expectedAuthVersion: 3,
      status: UserStatus.LOCKED,
      reason: "Khóa do phát hiện hoạt động bất thường.",
    });

    expect(result.status).toBe(UserStatus.LOCKED);
    expect(transaction.user.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "user-1",
        status: UserStatus.ACTIVE,
        authVersion: 3,
      }),
      data: expect.objectContaining({
        status: UserStatus.LOCKED,
        authVersion: { increment: 1 },
      }),
    });
    expect(transaction.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "CHANGE_USER_STATUS" }),
    });
    expect(transaction.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "USER_STATUS_CHANGED" }),
    });
  });

  it("revokes pending auth tokens when an account becomes DISABLED", async () => {
    const disabled = {
      ...activePatient,
      status: UserStatus.DISABLED,
      authVersion: 4,
    };
    transaction.user.findUnique
      .mockResolvedValueOnce(activeAdmin)
      .mockResolvedValueOnce(activePatient)
      .mockResolvedValueOnce(disabled);

    await service.updateStatus("admin-1", "user-1", {
      expectedStatus: UserStatus.ACTIVE,
      expectedAuthVersion: 3,
      status: UserStatus.DISABLED,
      reason: "Vô hiệu hóa theo yêu cầu xử lý vi phạm.",
    });

    expect(transaction.authToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", usedAt: null, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("prevents an Admin from changing their own status", async () => {
    transaction.user.findUnique
      .mockResolvedValueOnce(activeAdmin)
      .mockResolvedValueOnce(activeAdmin);

    await expect(
      service.updateStatus("admin-1", "admin-1", {
        expectedStatus: UserStatus.ACTIVE,
        expectedAuthVersion: 2,
        status: UserStatus.LOCKED,
        reason: "Thử tự khóa tài khoản quản trị viên.",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("keeps at least one active Admin in the system", async () => {
    const otherAdmin = { ...activeAdmin, id: "admin-2" };
    transaction.user.findUnique
      .mockResolvedValueOnce(activeAdmin)
      .mockResolvedValueOnce(otherAdmin);
    transaction.user.count.mockResolvedValue(1);

    await expect(
      service.updateStatus("admin-1", "admin-2", {
        expectedStatus: UserStatus.ACTIVE,
        expectedAuthVersion: 2,
        status: UserStatus.DISABLED,
        reason: "Vô hiệu hóa tài khoản quản trị không còn sử dụng.",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
