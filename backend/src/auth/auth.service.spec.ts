import {
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AuthTokenPurpose,
  AuthTokenSource,
  RoleName,
  UserStatus,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";
import { AuthOutboxCryptoService } from "./auth-outbox-crypto.service";

const password = "MatKhauAnToan123";
const registerDto = {
  displayName: "Nguyễn Minh An",
  email: "AN@EXAMPLE.COM",
  password,
  role: "PATIENT" as const,
  acceptedTerms: true as const,
  acceptedPrivacy: true as const,
};

describe("AuthService", () => {
  let storedUser: Record<string, unknown> | null;
  const transaction = {
    $queryRaw: jest.fn(),
    role: { upsert: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    authToken: {
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    userConsent: { createMany: jest.fn() },
    outboxEvent: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    authSession: { create: jest.fn(), updateMany: jest.fn() },
  };
  const prismaMock = {
    $transaction: jest.fn(
      (operation: ((client: typeof transaction) => unknown) | unknown[]) =>
        typeof operation === "function"
          ? operation(transaction)
          : Promise.all(operation),
    ),
    user: { findUnique: jest.fn(), update: jest.fn() },
    authToken: {
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    authAttempt: { count: jest.fn(), create: jest.fn() },
    auditLog: { count: jest.fn(), create: jest.fn() },
    authSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const prisma = prismaMock as unknown as PrismaService;
  const config = {
    getOrThrow: jest.fn(
      (key: string) => `${key}-test-secret-with-at-least-32-characters`,
    ),
    get: jest.fn(() => "2026-10-03"),
  } as unknown as ConfigService;
  const outboxCrypto = {
    encrypt: jest.fn((value: string) => `encrypted:${value.length}`),
  } as unknown as AuthOutboxCryptoService;
  const service = new AuthService(prisma, config, outboxCrypto);

  beforeEach(() => {
    jest.clearAllMocks();
    storedUser = null;
    transaction.user.findUnique.mockResolvedValue(null);
    transaction.role.upsert.mockResolvedValue({
      id: "role-patient",
      name: RoleName.PATIENT,
    });
    transaction.user.create.mockImplementation(({ data }) => {
      storedUser = {
        id: "user-1",
        email: data.email,
        fullName: data.fullName,
        passwordHash: data.passwordHash,
        status: UserStatus.PENDING_VERIFY,
        authVersion: 1,
        deletedAt: null,
        loginBlockedUntil: null,
        role: { name: RoleName.PATIENT },
        partnerMembership: null,
      };
      return storedUser;
    });
    transaction.user.update.mockResolvedValue({});
    transaction.$queryRaw.mockResolvedValue([]);
    transaction.authToken.count.mockResolvedValue(0);
    transaction.authToken.findFirst.mockResolvedValue(null);
    transaction.authToken.create.mockResolvedValue({ id: "token-1" });
    transaction.authToken.updateMany.mockResolvedValue({ count: 0 });
    transaction.userConsent.createMany.mockResolvedValue({ count: 2 });
    transaction.outboxEvent.create.mockResolvedValue({ id: "event-1" });
    transaction.auditLog.create.mockResolvedValue({ id: "audit-1" });
    transaction.authSession.create.mockResolvedValue({});
    transaction.authSession.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.authAttempt.count.mockResolvedValue(0);
    prismaMock.authAttempt.create.mockResolvedValue({});
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.authToken.update.mockResolvedValue({});
    prismaMock.authToken.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.auditLog.create.mockResolvedValue({});
    prismaMock.auditLog.count.mockResolvedValue(0);
  });

  it("creates a pending account, consents, verification token and outbox event", async () => {
    const result = await service.register(registerDto);

    expect(result).toEqual(
      expect.objectContaining({ verificationRequired: true }),
    );
    expect(result).not.toHaveProperty("accessToken");
    expect(result.user).toEqual(
      expect.objectContaining({
        email: "an@example.com",
        status: UserStatus.PENDING_VERIFY,
      }),
    );
    expect(String(storedUser?.passwordHash)).toMatch(/^scrypt\$/);
    expect(String(storedUser?.passwordHash)).not.toContain(password);
    expect(transaction.userConsent.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ type: "TERMS" }),
          expect.objectContaining({ type: "PRIVACY" }),
        ]),
      }),
    );
    expect(transaction.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "AUTH_EMAIL_VERIFICATION_REQUESTED",
      }),
    });
    expect(transaction.authToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
        source: AuthTokenSource.SIGNUP,
      }),
    });
  });

  it("blocks a forged partner registration", async () => {
    await expect(
      service.register({ ...registerDto, role: RoleName.PARTNER } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("activates a pending account using a valid one-time token", async () => {
    prismaMock.authToken.findUnique.mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
      usedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: "user-1",
        status: UserStatus.PENDING_VERIFY,
        deletedAt: null,
      },
    });

    await expect(service.verifyEmail("a".repeat(43))).resolves.toEqual({
      verified: true,
      userId: "user-1",
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        status: UserStatus.ACTIVE,
        emailVerifiedAt: expect.any(Date),
      }),
    });
  });

  it("counts and creates resend tokens separately from signup tokens", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "an@example.com",
      fullName: "Nguyễn Minh An",
      status: UserStatus.PENDING_VERIFY,
      deletedAt: null,
    });

    await expect(
      service.resendVerification("AN@EXAMPLE.COM"),
    ).resolves.toEqual({ accepted: true });

    expect(transaction.$queryRaw).toHaveBeenCalled();
    expect(transaction.authToken.count).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
        source: AuthTokenSource.RESEND,
        createdAt: { gte: expect.any(Date) },
      },
    });
    expect(transaction.authToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
        source: AuthTokenSource.RESEND,
      }),
    });
  });

  it("limits verification resends to three per hour", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "an@example.com",
      fullName: "Nguyễn Minh An",
      status: UserStatus.PENDING_VERIFY,
      deletedAt: null,
    });
    transaction.authToken.count.mockResolvedValue(3);

    const error = await service
      .resendVerification("an@example.com")
      .catch((reason: HttpException) => reason);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect(transaction.authToken.create).not.toHaveBeenCalled();
    expect(transaction.outboxEvent.create).not.toHaveBeenCalled();
  });

  it("refuses login until the email is verified", async () => {
    await service.register(registerDto);
    prismaMock.user.findUnique.mockResolvedValue(storedUser);

    await expect(
      service.login({
        email: registerDto.email,
        password,
        portal: "PUBLIC",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("issues a signed 15-minute token only for an active account", async () => {
    await service.register(registerDto);
    storedUser = { ...storedUser, status: UserStatus.ACTIVE };
    prismaMock.user.findUnique.mockImplementation(() => storedUser);

    const result = await service.login({
      email: registerDto.email,
      password,
      portal: "PUBLIC",
    });
    await expect(service.authenticate(result.accessToken)).resolves.toEqual({
      id: "user-1",
      role: RoleName.PATIENT,
      authVersion: 1,
    });
    expect(result.accessTokenExpiresInSeconds).toBe(900);
  });

  it("rejects access tokens after status, deletion or authVersion changes", async () => {
    await service.register(registerDto);
    const activeUser = {
      ...storedUser,
      status: UserStatus.ACTIVE,
    } as Record<string, unknown>;
    storedUser = activeUser;
    prismaMock.user.findUnique.mockImplementation(() => storedUser);
    const result = await service.login({
      email: registerDto.email,
      password,
      portal: "PUBLIC",
    });

    const invalidUserStates = [
      { ...activeUser, status: UserStatus.LOCKED },
      { ...activeUser, status: UserStatus.DISABLED },
      { ...activeUser, deletedAt: new Date() },
      { ...activeUser, authVersion: 2 },
    ];
    for (const invalidUser of invalidUserStates) {
      storedUser = invalidUser;
      await expect(service.authenticate(result.accessToken)).rejects.toThrow(
        UnauthorizedException,
      );
    }
  });

  it("records an invalid login without revealing whether the email exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({
        email: "missing@example.com",
        password: "SaiMatKhauAnToan123",
        portal: "PUBLIC",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prismaMock.authAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ success: false }),
    });
  });

  it("returns the same accepted response for an unknown password-reset email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.requestPasswordReset("missing@example.com", { ip: "127.0.0.1" }),
    ).resolves.toEqual({ accepted: true });
    expect(transaction.outboxEvent.create).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "REQUEST_PASSWORD_RESET",
        entityType: "EMAIL_HASH",
      }),
    });
  });

  it("creates a 30-minute one-time reset token for an active account", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      fullName: "Nguyễn An",
      status: UserStatus.ACTIVE,
      deletedAt: null,
    });
    prismaMock.authToken.count.mockResolvedValue(0);

    await expect(
      service.requestPasswordReset("member@example.com", { ip: "127.0.0.1" }),
    ).resolves.toEqual({ accepted: true });
    expect(transaction.authToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        purpose: AuthTokenPurpose.PASSWORD_RESET,
        expiresAt: expect.any(Date),
      }),
    });
    expect(transaction.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "AUTH_PASSWORD_RESET_REQUESTED" }),
    });
  });

  it("resets a locked account password, preserves LOCKED and revokes all sessions", async () => {
    const lockedUser = {
      id: "user-1",
      status: UserStatus.LOCKED,
      deletedAt: null,
      authVersion: 4,
    };
    prismaMock.authToken.findUnique.mockResolvedValue({
      id: "reset-token-1",
      userId: "user-1",
      purpose: AuthTokenPurpose.PASSWORD_RESET,
      usedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: lockedUser,
    });
    transaction.authToken.updateMany.mockResolvedValue({ count: 1 });
    transaction.user.findUnique.mockResolvedValue(lockedUser);
    transaction.user.update.mockResolvedValue({});

    await expect(
      service.resetPassword(
        { token: "a".repeat(43), password: "MatKhauMoiAnToan123" },
        { ip: "127.0.0.1" },
      ),
    ).resolves.toEqual({ reset: true });
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        passwordHash: expect.stringMatching(/^scrypt\$/),
        authVersion: { increment: 1 },
      }),
    });
    expect(transaction.user.update.mock.calls[0][0].data).not.toHaveProperty(
      "status",
    );
    expect(transaction.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("keeps the current email until the new address is verified", async () => {
    await service.register(registerDto);
    const activeUser = { ...storedUser, status: UserStatus.ACTIVE } as Record<
      string,
      unknown
    >;
    transaction.user.findUnique.mockImplementation(({ where }) =>
      where.id === "user-1" ? activeUser : null,
    );

    await expect(
      service.requestEmailChange(
        "user-1",
        { newEmail: "NEW@EXAMPLE.COM", currentPassword: password },
        { ip: "127.0.0.1" },
      ),
    ).resolves.toEqual({ accepted: true, pendingEmail: "new@example.com" });

    expect(activeUser.email).toBe("an@example.com");
    expect(transaction.user.update).not.toHaveBeenCalled();
    expect(transaction.authToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        purpose: AuthTokenPurpose.EMAIL_CHANGE,
        targetEmail: "new@example.com",
      }),
    });
    expect(transaction.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "AUTH_EMAIL_CHANGE_REQUESTED",
        payload: expect.objectContaining({ recipient: "new@example.com" }),
      }),
    });
  });

  it("changes the email only once and revokes every old session", async () => {
    const currentUser = {
      id: "user-1",
      email: "old@example.com",
      status: UserStatus.ACTIVE,
      deletedAt: null,
      authVersion: 4,
    };
    prismaMock.authToken.findUnique.mockResolvedValue({
      id: "email-change-token-1",
      userId: "user-1",
      purpose: AuthTokenPurpose.EMAIL_CHANGE,
      targetEmail: "new@example.com",
      usedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: currentUser,
    });
    transaction.authToken.updateMany.mockResolvedValue({ count: 1 });
    transaction.user.findUnique.mockResolvedValue(currentUser);
    transaction.authSession.updateMany.mockResolvedValue({ count: 3 });

    await expect(
      service.verifyEmailChange("a".repeat(43), { ip: "127.0.0.1" }),
    ).resolves.toEqual({
      changed: true,
      email: "new@example.com",
      revokedSessions: 3,
    });
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        email: "new@example.com",
        emailVerifiedAt: expect.any(Date),
        authVersion: { increment: 1 },
      },
    });
    expect(transaction.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(transaction.authToken.updateMany).toHaveBeenLastCalledWith({
      where: {
        userId: "user-1",
        purpose: AuthTokenPurpose.EMAIL_CHANGE,
      },
      data: { revokedAt: expect.any(Date), targetEmail: null },
    });
  });

  it("rotates a valid refresh token and revokes the old session", async () => {
    prismaMock.authSession.findUnique.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: "user-1",
        email: "an@example.com",
        fullName: "Nguyễn Minh An",
        status: UserStatus.ACTIVE,
        deletedAt: null,
        authVersion: 1,
        role: { name: RoleName.PATIENT },
        partnerMembership: null,
      },
      authVersion: 1,
    });
    transaction.authSession.updateMany.mockResolvedValue({ count: 1 });

    const refreshed = await service.refresh("refresh-token-1");
    expect(refreshed.result.user.id).toBe("user-1");
    expect(refreshed.refreshToken).not.toBe("refresh-token-1");
    expect(transaction.authSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: "session-1",
        revokedAt: null,
        authVersion: 1,
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(transaction.authSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        authVersion: 1,
        tokenHash: expect.any(String),
      }),
    });
  });

  it("rejects a refresh token if another request already rotated it", async () => {
    prismaMock.authSession.findUnique.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: "user-1",
        email: "an@example.com",
        fullName: "Nguyễn Minh An",
        status: UserStatus.ACTIVE,
        deletedAt: null,
        authVersion: 1,
        role: { name: RoleName.PATIENT },
        partnerMembership: null,
      },
      authVersion: 1,
    });
    transaction.authSession.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.refresh("refresh-token-1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(transaction.authSession.create).not.toHaveBeenCalled();
  });

  it("revokes every refresh session when logging out all devices", async () => {
    transaction.authSession.updateMany.mockResolvedValue({ count: 3 });

    await expect(
      service.revokeAllRefreshSessions("user-1", { ip: "127.0.0.1" }),
    ).resolves.toEqual({ revokedSessions: 3 });
    expect(transaction.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "user-1",
        action: "LOGOUT_ALL_DEVICES",
        after: { revokedSessions: 3 },
      }),
    });
  });
});
