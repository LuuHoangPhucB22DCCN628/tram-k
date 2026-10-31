import { ConflictException, ForbiddenException } from "@nestjs/common";
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

  it("applies search, status, role and pagination filters to the account list", async () => {
    await service.list("admin-1", {
      search: "  member@example.com ",
      status: UserStatus.ACTIVE,
      role: RoleName.PARTNER,
      page: 3,
      limit: 10,
    });

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: UserStatus.ACTIVE,
        partnerMembership: { isNot: null },
        OR: [
          { id: { contains: "member@example.com", mode: "insensitive" } },
          {
            email: {
              contains: "member@example.com",
              mode: "insensitive",
            },
          },
          {
            fullName: {
              contains: "member@example.com",
              mode: "insensitive",
            },
          },
        ],
      },
      include: { role: true, partnerMembership: true },
      orderBy: { createdAt: "desc" },
      skip: 20,
      take: 10,
    });
  });

  it("denies account listing to a non-Admin", async () => {
    prismaMock.user.findUnique.mockResolvedValue(activePatient);

    await expect(
      service.list("user-1", { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ["locked", { ...activeAdmin, status: UserStatus.LOCKED }],
    ["deleted", { ...activeAdmin, deletedAt: new Date() }],
  ])("denies account listing to a %s Admin", async (_description, admin) => {
    prismaMock.user.findUnique.mockResolvedValue(admin);

    await expect(
      service.list("admin-1", { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
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

  it("rejects a stale expected status or auth version before changing an account", async () => {
    transaction.user.findUnique
      .mockResolvedValueOnce(activeAdmin)
      .mockResolvedValueOnce({ ...activePatient, authVersion: 4 });

    await expect(
      service.updateStatus("admin-1", "user-1", {
        expectedStatus: UserStatus.ACTIVE,
        expectedAuthVersion: 3,
        status: UserStatus.LOCKED,
        reason: "Thay đổi trạng thái sau khi thông tin đã cũ.",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.user.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a concurrent account status update", async () => {
    transaction.user.findUnique
      .mockResolvedValueOnce(activeAdmin)
      .mockResolvedValueOnce(activePatient);
    transaction.user.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.updateStatus("admin-1", "user-1", {
        expectedStatus: UserStatus.ACTIVE,
        expectedAuthVersion: 3,
        status: UserStatus.LOCKED,
        reason: "Khóa tài khoản sau khi xác minh yêu cầu.",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.authSession.updateMany).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
    expect(transaction.outboxEvent.create).not.toHaveBeenCalled();
  });
});
