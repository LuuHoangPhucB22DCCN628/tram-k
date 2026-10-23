import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AuthTokenPurpose,
  AuthTokenSource,
  ConsentType,
  Prisma,
  RoleName,
  UserStatus,
} from "@prisma/client";
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";

import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "./auth-user.interface";
import { AuthOutboxCryptoService } from "./auth-outbox-crypto.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RequestEmailChangeDto } from "./dto/request-email-change.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

const scrypt = promisify(scryptCallback);
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const UNVERIFIED_ACCOUNT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_EMAIL_FAILURES = 5;
const MAX_IP_FAILURES = 20;
const MAX_VERIFICATION_RESENDS_PER_HOUR = 3;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000;
const MAX_PASSWORD_RESET_REQUESTS_PER_HOUR = 3;
const EMAIL_CHANGE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_EMAIL_CHANGE_REQUESTS_PER_HOUR = 3;

interface JwtPayload {
  readonly sub: string;
  readonly role: RoleName;
  readonly av: number;
  readonly iat: number;
  readonly exp: number;
}

function canResetPassword(status: UserStatus): boolean {
  return status === UserStatus.ACTIVE || status === UserStatus.LOCKED;
}

export interface AuthRequestContext {
  readonly ip?: string;
  readonly correlationId?: string;
}

@Injectable()
export class AuthService {
  private readonly secret: string;
  private readonly ipHashSecret: string;
  private readonly termsVersion: string;
  private readonly privacyVersion: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
    private readonly outboxCrypto: AuthOutboxCryptoService,
  ) {
    this.secret = config.getOrThrow<string>("JWT_SECRET");
    this.ipHashSecret = config.getOrThrow<string>("IP_HASH_SECRET");
    this.termsVersion = config.get<string>("TERMS_VERSION") ?? "2026-10-03";
    this.privacyVersion = config.get<string>("PRIVACY_VERSION") ?? "2026-10-03";
  }

  async register(dto: RegisterDto, context: AuthRequestContext = {}) {
    if (![RoleName.PATIENT, RoleName.CARER].includes(dto.role)) {
      throw new ForbiddenException(
        "Quyền đối tác chỉ được cấp sau khi hồ sơ được duyệt.",
      );
    }

    const email = this.normalizeEmail(dto.email);
    const passwordHash = await this.hashPassword(dto.password);
    const rawToken = randomBytes(32).toString("base64url");
    const now = new Date();
    const correlationId = context.correlationId ?? randomUUID();

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.user.findUnique({
          where: { email },
        });
        const canRestore =
          existing?.status === UserStatus.PENDING_VERIFY &&
          !!existing.deletedAt;
        if (existing && !canRestore) {
          throw new ConflictException("Email này đã được sử dụng.");
        }

        const role = await transaction.role.upsert({
          where: { name: dto.role },
          update: {},
          create: { name: dto.role },
        });
        const user = canRestore
          ? await transaction.user.update({
            where: { id: existing.id },
            data: {
              fullName: dto.displayName.trim(),
              passwordHash,
              roleId: role.id,
              status: UserStatus.PENDING_VERIFY,
              emailVerifiedAt: null,
              deletedAt: null,
              deletedById: null,
              authVersion: { increment: 1 },
              verificationCleanupAt: new Date(
                now.getTime() + UNVERIFIED_ACCOUNT_TTL_MS,
              ),
            },
          })
          : await transaction.user.create({
            data: {
              email,
              fullName: dto.displayName.trim(),
              passwordHash,
              roleId: role.id,
              status: UserStatus.PENDING_VERIFY,
              verificationCleanupAt: new Date(
                now.getTime() + UNVERIFIED_ACCOUNT_TTL_MS,
              ),
            },
          });

        await transaction.authToken.updateMany({
          where: {
            userId: user.id,
            purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
            usedAt: null,
            revokedAt: null,
          },
          data: { revokedAt: now },
        });
        const token = await transaction.authToken.create({
          data: {
            userId: user.id,
            purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
            source: AuthTokenSource.SIGNUP,
            tokenHash: this.hashOpaqueToken(rawToken),
            expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS),
          },
        });
        await transaction.userConsent.createMany({
          data: [
            {
              userId: user.id,
              type: ConsentType.TERMS,
              version: this.termsVersion,
              acceptedAt: now,
              source: "WEB_REGISTRATION",
            },
            {
              userId: user.id,
              type: ConsentType.PRIVACY,
              version: this.privacyVersion,
              acceptedAt: now,
              source: "WEB_REGISTRATION",
            },
          ],
          skipDuplicates: true,
        });
        await transaction.outboxEvent.create({
          data: {
            eventId: randomUUID(),
            type: "AUTH_EMAIL_VERIFICATION_REQUESTED",
            aggregateType: "USER",
            aggregateId: user.id,
            payload: {
              recipient: email,
              displayName: user.fullName,
              tokenId: token.id,
              encryptedToken: this.outboxCrypto.encrypt(rawToken),
            },
          },
        });
        await transaction.auditLog.create({
          data: {
            actorType: "USER",
            actorId: user.id,
            action: canRestore
              ? "RESTORE_UNVERIFIED_ACCOUNT"
              : "REGISTER_ACCOUNT",
            entityType: "USER",
            entityId: user.id,
            after: { status: UserStatus.PENDING_VERIFY, role: dto.role },
            ipHash: this.hashIp(context.ip),
            correlationId,
          },
        });

        return {
          user: {
            id: user.id,
            displayName: user.fullName,
            email: user.email,
            role: dto.role,
            status: UserStatus.PENDING_VERIFY,
          },
          verificationRequired: true,
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Email này đã được sử dụng.");
      }
      throw error;
    }
  }

  async verifyEmail(rawToken: string, context: AuthRequestContext = {}) {
    const now = new Date();
    const token = await this.prisma.authToken.findUnique({
      where: { tokenHash: this.hashOpaqueToken(rawToken) },
      include: { user: true },
    });
    if (
      !token ||
      token.purpose !== AuthTokenPurpose.EMAIL_VERIFICATION ||
      token.usedAt ||
      token.revokedAt ||
      token.expiresAt <= now ||
      token.user.status !== UserStatus.PENDING_VERIFY ||
      token.user.deletedAt
    ) {
      throw new UnauthorizedException(
        "Liên kết xác minh không hợp lệ hoặc đã hết hạn.",
      );
    }

    await this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.authToken.updateMany({
        where: {
          id: token.id,
          purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) {
        throw new UnauthorizedException(
          "Liên kết xác minh không hợp lệ hoặc đã hết hạn.",
        );
      }

      const activated = await transaction.user.updateMany({
        where: {
          id: token.userId,
          status: UserStatus.PENDING_VERIFY,
          deletedAt: null,
        },
        data: {
          status: UserStatus.ACTIVE,
          emailVerifiedAt: now,
          verificationCleanupAt: null,
          loginBlockedUntil: null,
        },
      });
      if (activated.count !== 1) {
        throw new UnauthorizedException(
          "Liên kết xác minh không hợp lệ hoặc đã hết hạn.",
        );
      }

      await transaction.authToken.updateMany({
        where: {
          userId: token.userId,
          purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
          id: { not: token.id },
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
      await transaction.auditLog.create({
        data: {
          actorType: "USER",
          actorId: token.userId,
          action: "VERIFY_EMAIL",
          entityType: "USER",
          entityId: token.userId,
          before: { status: UserStatus.PENDING_VERIFY },
          after: { status: UserStatus.ACTIVE },
          ipHash: this.hashIp(context.ip),
          correlationId: context.correlationId ?? randomUUID(),
        },
      });
    });
    return { verified: true, userId: token.userId };
  }

  async resendVerification(emailValue: string) {
    const email = this.normalizeEmail(emailValue);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.status !== UserStatus.PENDING_VERIFY || user.deletedAt) {
      return { accepted: true };
    }

    const now = new Date();
    const rawToken = randomBytes(32).toString("base64url");

    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(42, hashtext(${user.id}))`;

      const since = new Date(Date.now() - 60 * 60 * 1000);
      const recentCount = await transaction.authToken.count({
        where: {
          userId: user.id,
          purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
          source: AuthTokenSource.RESEND,
          createdAt: { gte: since },
        },
      });
      if (recentCount >= MAX_VERIFICATION_RESENDS_PER_HOUR) {
        throw new HttpException(
          "Bạn đã yêu cầu quá nhiều email. Vui lòng thử lại sau.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await transaction.authToken.updateMany({
        where: {
          userId: user.id,
          purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      const token = await transaction.authToken.create({
        data: {
          userId: user.id,
          purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
          source: AuthTokenSource.RESEND,
          tokenHash: this.hashOpaqueToken(rawToken),
          expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS),
        },
      });

      await transaction.outboxEvent.create({
        data: {
          eventId: randomUUID(),
          type: "AUTH_EMAIL_VERIFICATION_REQUESTED",
          aggregateType: "USER",
          aggregateId: user.id,
          payload: {
            recipient: email,
            displayName: user.fullName,
            tokenId: token.id,
            encryptedToken: this.outboxCrypto.encrypt(rawToken),
          },
        },
      });
    });
    return { accepted: true };
  }

  async requestPasswordReset(
    emailValue: string,
    context: AuthRequestContext = {},
  ) {
    const email = this.normalizeEmail(emailValue);
    const emailHash = this.hashIdentifier(email);
    const ipHash = this.hashIp(context.ip) ?? this.hashIdentifier("unknown-ip");
    const correlationId = context.correlationId ?? randomUUID();
    const since = new Date(Date.now() - PASSWORD_RESET_WINDOW_MS);
    const user = await this.prisma.user.findUnique({ where: { email } });
    const eligible = !!user && !user.deletedAt && canResetPassword(user.status);

    const [ipRequestCount, accountRequestCount] = await Promise.all([
      this.prisma.auditLog.count({
        where: {
          action: "REQUEST_PASSWORD_RESET",
          ipHash,
          occurredAt: { gte: since },
        },
      }),
      eligible
        ? this.prisma.authToken.count({
          where: {
            userId: user.id,
            purpose: AuthTokenPurpose.PASSWORD_RESET,
            createdAt: { gte: since },
          },
        })
        : Promise.resolve(0),
    ]);
    if (
      ipRequestCount >= MAX_PASSWORD_RESET_REQUESTS_PER_HOUR ||
      accountRequestCount >= MAX_PASSWORD_RESET_REQUESTS_PER_HOUR
    ) {
      throw new HttpException(
        {
          message: "Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.",
          retryAfterSeconds: Math.ceil(PASSWORD_RESET_WINDOW_MS / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!eligible) {
      await this.prisma.auditLog.create({
        data: {
          actorType: "ANONYMOUS",
          action: "REQUEST_PASSWORD_RESET",
          entityType: "EMAIL_HASH",
          entityId: emailHash,
          after: { eligible: false },
          ipHash,
          correlationId,
        },
      });
      return { accepted: true };
    }

    const now = new Date();
    const rawToken = randomBytes(32).toString("base64url");
    await this.prisma.$transaction(async (transaction) => {
      await transaction.authToken.updateMany({
        where: {
          userId: user.id,
          purpose: AuthTokenPurpose.PASSWORD_RESET,
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
      const token = await transaction.authToken.create({
        data: {
          userId: user.id,
          purpose: AuthTokenPurpose.PASSWORD_RESET,
          tokenHash: this.hashOpaqueToken(rawToken),
          expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
        },
      });
      await transaction.outboxEvent.create({
        data: {
          eventId: randomUUID(),
          type: "AUTH_PASSWORD_RESET_REQUESTED",
          aggregateType: "USER",
          aggregateId: user.id,
          payload: {
            recipient: email,
            displayName: user.fullName,
            tokenId: token.id,
            encryptedToken: this.outboxCrypto.encrypt(rawToken),
          },
        },
      });
      await transaction.auditLog.create({
        data: {
          actorType: "ANONYMOUS",
          action: "REQUEST_PASSWORD_RESET",
          entityType: "USER",
          entityId: user.id,
          after: { eligible: true },
          ipHash,
          correlationId,
        },
      });
    });
    return { accepted: true };
  }

  async resetPassword(dto: ResetPasswordDto, context: AuthRequestContext = {}) {
    const now = new Date();
    const token = await this.prisma.authToken.findUnique({
      where: { tokenHash: this.hashOpaqueToken(dto.token) },
      include: { user: true },
    });
    if (
      !token ||
      token.purpose !== AuthTokenPurpose.PASSWORD_RESET ||
      token.usedAt ||
      token.revokedAt ||
      token.expiresAt <= now ||
      token.user.deletedAt ||
      !canResetPassword(token.user.status)
    ) {
      throw new UnauthorizedException(
        "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
      );
    }

    const passwordHash = await this.hashPassword(dto.password);
    await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.authToken.updateMany({
        where: {
          id: token.id,
          purpose: AuthTokenPurpose.PASSWORD_RESET,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) {
        throw new UnauthorizedException(
          "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
        );
      }

      const currentUser = await transaction.user.findUnique({
        where: { id: token.userId },
      });
      if (
        !currentUser ||
        currentUser.deletedAt ||
        !canResetPassword(currentUser.status)
      ) {
        throw new UnauthorizedException(
          "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
        );
      }

      await transaction.authToken.updateMany({
        where: {
          userId: token.userId,
          purpose: AuthTokenPurpose.PASSWORD_RESET,
          id: { not: token.id },
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
      await transaction.user.update({
        where: { id: token.userId },
        data: {
          passwordHash,
          authVersion: { increment: 1 },
          loginBlockedUntil: null,
        },
      });
      await transaction.authSession.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.auditLog.create({
        data: {
          actorType: "USER",
          actorId: token.userId,
          action: "RESET_PASSWORD",
          entityType: "USER",
          entityId: token.userId,
          before: {
            authVersion: currentUser.authVersion,
            status: currentUser.status,
          },
          after: {
            authVersion: currentUser.authVersion + 1,
            status: currentUser.status,
          },
          ipHash: this.hashIp(context.ip),
          correlationId: context.correlationId ?? randomUUID(),
        },
      });
    });
    return { reset: true };
  }

  async requestEmailChange(
    userId: string,
    dto: RequestEmailChangeDto,
    context: AuthRequestContext = {},
  ) {
    const targetEmail = this.normalizeEmail(dto.newEmail);
    const now = new Date();
    const recentSince = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const user = await transaction.user.findUnique({
            where: { id: userId },
          });
          if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException("Tài khoản không còn hợp lệ.");
          }
          if (
            !(await this.verifyPassword(dto.currentPassword, user.passwordHash))
          ) {
            throw new BadRequestException("Mật khẩu hiện tại không đúng.");
          }
          if (targetEmail === user.email) {
            throw new BadRequestException(
              "Email mới phải khác email hiện tại.",
            );
          }

          const [existingUser, existingReservation, recentCount] =
            await Promise.all([
              transaction.user.findUnique({ where: { email: targetEmail } }),
              transaction.authToken.findFirst({
                where: {
                  targetEmail,
                  purpose: AuthTokenPurpose.EMAIL_CHANGE,
                  usedAt: null,
                  revokedAt: null,
                  expiresAt: { gt: now },
                },
              }),
              transaction.authToken.count({
                where: {
                  userId,
                  purpose: AuthTokenPurpose.EMAIL_CHANGE,
                  createdAt: { gte: recentSince },
                },
              }),
            ]);
          if (
            existingUser ||
            (existingReservation && existingReservation.userId !== userId)
          ) {
            throw new ConflictException("Email này đã được sử dụng.");
          }
          if (recentCount >= MAX_EMAIL_CHANGE_REQUESTS_PER_HOUR) {
            throw new HttpException(
              "Bạn đã yêu cầu đổi email quá nhiều lần. Vui lòng thử lại sau.",
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }

          await transaction.authToken.updateMany({
            where: {
              userId,
              purpose: AuthTokenPurpose.EMAIL_CHANGE,
              usedAt: null,
              revokedAt: null,
            },
            data: { revokedAt: now, targetEmail: null },
          });
          const rawToken = randomBytes(32).toString("base64url");
          const token = await transaction.authToken.create({
            data: {
              userId,
              purpose: AuthTokenPurpose.EMAIL_CHANGE,
              tokenHash: this.hashOpaqueToken(rawToken),
              targetEmail,
              expiresAt: new Date(now.getTime() + EMAIL_CHANGE_TTL_MS),
            },
          });
          await transaction.outboxEvent.create({
            data: {
              eventId: randomUUID(),
              type: "AUTH_EMAIL_CHANGE_REQUESTED",
              aggregateType: "USER",
              aggregateId: userId,
              payload: {
                recipient: targetEmail,
                displayName: user.fullName,
                tokenId: token.id,
                encryptedToken: this.outboxCrypto.encrypt(rawToken),
              },
            },
          });
          await transaction.auditLog.create({
            data: {
              actorType: "USER",
              actorId: userId,
              action: "REQUEST_EMAIL_CHANGE",
              entityType: "USER",
              entityId: userId,
              before: { emailHash: this.hashIdentifier(user.email) },
              after: { emailHash: this.hashIdentifier(targetEmail) },
              ipHash: this.hashIp(context.ip),
              correlationId: context.correlationId ?? randomUUID(),
            },
          });

          return { accepted: true, pendingEmail: targetEmail };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Email này đã được sử dụng.");
      }
      throw error;
    }
  }

  async verifyEmailChange(rawToken: string, context: AuthRequestContext = {}) {
    const now = new Date();
    const token = await this.prisma.authToken.findUnique({
      where: { tokenHash: this.hashOpaqueToken(rawToken) },
      include: { user: true },
    });
    if (
      !token ||
      token.purpose !== AuthTokenPurpose.EMAIL_CHANGE ||
      !token.targetEmail ||
      token.usedAt ||
      token.revokedAt ||
      token.expiresAt <= now ||
      token.user.deletedAt ||
      token.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException(
        "Liên kết đổi email không hợp lệ hoặc đã hết hạn.",
      );
    }
    const targetEmail = token.targetEmail;

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const claimed = await transaction.authToken.updateMany({
            where: {
              id: token.id,
              purpose: AuthTokenPurpose.EMAIL_CHANGE,
              targetEmail,
              usedAt: null,
              revokedAt: null,
              expiresAt: { gt: now },
            },
            data: { usedAt: now },
          });
          if (claimed.count !== 1) {
            throw new UnauthorizedException(
              "Liên kết đổi email không hợp lệ hoặc đã hết hạn.",
            );
          }

          const currentUser = await transaction.user.findUnique({
            where: { id: token.userId },
          });
          if (
            !currentUser ||
            currentUser.deletedAt ||
            currentUser.status !== UserStatus.ACTIVE
          ) {
            throw new UnauthorizedException("Tài khoản không còn hợp lệ.");
          }

          await transaction.user.update({
            where: { id: token.userId },
            data: {
              email: targetEmail,
              emailVerifiedAt: now,
              authVersion: { increment: 1 },
            },
          });
          const revoked = await transaction.authSession.updateMany({
            where: { userId: token.userId, revokedAt: null },
            data: { revokedAt: now },
          });
          await transaction.authToken.updateMany({
            where: {
              userId: token.userId,
              purpose: AuthTokenPurpose.EMAIL_CHANGE,
            },
            data: { revokedAt: now, targetEmail: null },
          });
          await transaction.auditLog.create({
            data: {
              actorType: "USER",
              actorId: token.userId,
              action: "VERIFY_EMAIL_CHANGE",
              entityType: "USER",
              entityId: token.userId,
              before: {
                emailHash: this.hashIdentifier(currentUser.email),
                authVersion: currentUser.authVersion,
              },
              after: {
                emailHash: this.hashIdentifier(targetEmail),
                authVersion: currentUser.authVersion + 1,
                revokedSessions: revoked.count,
              },
              ipHash: this.hashIp(context.ip),
              correlationId: context.correlationId ?? randomUUID(),
            },
          });

          return {
            changed: true,
            email: targetEmail,
            revokedSessions: revoked.count,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Email này đã được sử dụng.");
      }
      throw error;
    }
  }

  async login(dto: LoginDto, context: AuthRequestContext = {}) {
    const email = this.normalizeEmail(dto.email);
    const emailHash = this.hashIdentifier(email);
    const ipHash = this.hashIp(context.ip) ?? this.hashIdentifier("unknown-ip");
    const since = new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MS);
    const [user, emailFailures, ipFailures] = await Promise.all([
      this.prisma.user.findUnique({
        where: { email },
        include: { role: true, partnerMembership: true },
      }),
      this.prisma.authAttempt.count({
        where: { emailHash, success: false, createdAt: { gte: since } },
      }),
      this.prisma.authAttempt.count({
        where: { ipHash, success: false, createdAt: { gte: since } },
      }),
    ]);
    if (
      emailFailures >= MAX_EMAIL_FAILURES ||
      ipFailures >= MAX_IP_FAILURES ||
      (user?.loginBlockedUntil && user.loginBlockedUntil > new Date())
    ) {
      throw new HttpException(
        "Đăng nhập tạm thời bị giới hạn. Vui lòng thử lại sau.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const validPassword = user
      ? await this.verifyPassword(dto.password, user.passwordHash)
      : false;
    if (!user || !validPassword) {
      await this.prisma.authAttempt.create({
        data: { userId: user?.id, emailHash, ipHash, success: false },
      });
      if (user && emailFailures + 1 >= MAX_EMAIL_FAILURES) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            loginBlockedUntil: new Date(Date.now() + LOGIN_ATTEMPT_WINDOW_MS),
          },
        });
      }
      throw new UnauthorizedException("Email hoặc mật khẩu không đúng.");
    }
    if (user.deletedAt || user.status !== UserStatus.ACTIVE) {
      if (user.status === UserStatus.PENDING_VERIFY && !user.deletedAt) {
        throw new ForbiddenException(
          "Vui lòng xác minh email trước khi đăng nhập.",
        );
      }
      throw new ForbiddenException("Tài khoản hiện không thể đăng nhập.");
    }

    const effectiveRole = user.partnerMembership
      ? RoleName.PARTNER
      : user.role.name;
    const correctPortal =
      dto.portal === "ADMIN"
        ? effectiveRole === RoleName.ADMIN
        : effectiveRole !== RoleName.ADMIN;
    if (!correctPortal)
      throw new ForbiddenException("Tài khoản không có quyền tại cổng này.");

    await this.prisma.authAttempt.create({
      data: { userId: user.id, emailHash, ipHash, success: true },
    });
    return this.toResult(user);
  }

  async authenticate(token: string): Promise<AuthenticatedUser> {
    const payload = this.verifyToken(token);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true, partnerMembership: true },
    });
    if (
      !user ||
      user.deletedAt ||
      user.status !== UserStatus.ACTIVE ||
      user.authVersion !== payload.av
    ) {
      throw new UnauthorizedException("Phiên đăng nhập không hợp lệ.");
    }
    return {
      id: user.id,
      role: user.partnerMembership ? RoleName.PARTNER : user.role.name,
      authVersion: user.authVersion,
    };
  }

  async createRefreshSession(userId: string, role: RoleName): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { authVersion: true },
    });
    if (!user) throw new UnauthorizedException("Tài khoản không còn hợp lệ.");
    await this.prisma.authSession.create({
      data: {
        userId,
        tokenHash: this.hashOpaqueToken(token),
        familyId: randomUUID(),
        authVersion: user.authVersion,
        expiresAt: new Date(Date.now() + this.refreshTtlMs(role)),
      },
    });
    return token;
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: this.hashOpaqueToken(refreshToken) },
      include: { user: { include: { role: true, partnerMembership: true } } },
    });

    if (!session) {
      throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
    }

    if (session.revokedAt !== null) {
      await this.prisma.authSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      })

      throw new UnauthorizedException(
        "Phát hiện tái sử dụng token. Tất cả phiên đăng nhập đã bị thu hồi vì lý do bảo mật.",
      );
    }

    if (
      session.expiresAt <= new Date() ||
      session.user.deletedAt ||
      session.user.status !== UserStatus.ACTIVE ||
      session.authVersion !== session.user.authVersion
    ) {
      throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
    }

    const role = session.user.partnerMembership
      ? RoleName.PARTNER
      : session.user.role.name;
    const nextToken = randomBytes(32).toString("base64url");
    const now = new Date();

    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.authSession.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
          authVersion: session.authVersion,
        },
        data: { revokedAt: now },
      });
      if (revoked.count !== 1) {
        throw new UnauthorizedException(
          "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
        );
      }
      await transaction.authSession.create({
        data: {
          userId: session.userId,
          tokenHash: this.hashOpaqueToken(nextToken),
          familyId: session.familyId,
          authVersion: session.user.authVersion,
          expiresAt: new Date(now.getTime() + this.refreshTtlMs(role)),
        },
      });
    });
    return { result: this.toResult(session.user), refreshToken: nextToken };
  }

  async revokeRefreshSession(refreshToken: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { tokenHash: this.hashOpaqueToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshSessions(
    userId: string,
    context: AuthRequestContext = {},
  ): Promise<{ revokedSessions: number }> {
    const now = new Date();
    return this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.auditLog.create({
        data: {
          actorType: "USER",
          actorId: userId,
          action: "LOGOUT_ALL_DEVICES",
          entityType: "USER",
          entityId: userId,
          after: { revokedSessions: revoked.count },
          ipHash: this.hashIp(context.ip),
          correlationId: context.correlationId ?? randomUUID(),
        },
      });
      return { revokedSessions: revoked.count };
    });
  }

  refreshTtlMs(role: RoleName): number {
    if (role === RoleName.ADMIN) return 8 * 60 * 60 * 1000;
    if (role === RoleName.PARTNER) return 3 * 24 * 60 * 60 * 1000;
    return 7 * 24 * 60 * 60 * 1000;
  }

  private toResult(user: {
    id: string;
    email: string;
    fullName: string;
    authVersion: number;
    role: { name: RoleName };
    partnerMembership: unknown;
  }) {
    const role = user.partnerMembership ? RoleName.PARTNER : user.role.name;
    return {
      user: {
        id: user.id,
        displayName: user.fullName,
        email: user.email,
        role,
      },
      accessToken: this.signToken({
        id: user.id,
        role,
        authVersion: user.authVersion,
      }),
      accessTokenExpiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  private signToken(user: AuthenticatedUser): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = this.encode({ alg: "HS256", typ: "JWT" });
    const payload = this.encode({
      sub: user.id,
      role: user.role,
      av: user.authVersion,
      iat: issuedAt,
      exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
    });
    return `${header}.${payload}.${this.signature(`${header}.${payload}`)}`;
  }

  private verifyToken(token: string): JwtPayload {
    const [header, payload, signature, extra] = token.split(".");
    if (!header || !payload || !signature || extra) {
      throw new UnauthorizedException("Phiên đăng nhập không hợp lệ.");
    }
    const expected = Buffer.from(this.signature(`${header}.${payload}`));
    const received = Buffer.from(signature);
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException("Phiên đăng nhập không hợp lệ.");
    }
    try {
      const decoded = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8"),
      ) as JwtPayload;
      if (
        !decoded.sub ||
        !Object.values(RoleName).includes(decoded.role) ||
        !decoded.av
      )
        throw new Error();
      if (decoded.exp <= Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException("Phiên đăng nhập đã hết hạn.");
      }
      return decoded;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Phiên đăng nhập không hợp lệ.");
    }
  }

  private signature(value: string): string {
    return createHmac("sha256", this.secret).update(value).digest("base64url");
  }

  private hashOpaqueToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private hashIdentifier(value: string): string {
    return createHmac("sha256", this.ipHashSecret).update(value).digest("hex");
  }

  private hashIp(ip?: string): string | null {
    return ip ? this.hashIdentifier(ip) : null;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
  }

  private async verifyPassword(
    password: string,
    verifier: string,
  ): Promise<boolean> {
    const [algorithm, encodedSalt, encodedHash, extra] = verifier.split("$");
    if (algorithm !== "scrypt" || !encodedSalt || !encodedHash || extra)
      return false;
    const expected = Buffer.from(encodedHash, "base64url");
    const actual = (await scrypt(
      password,
      Buffer.from(encodedSalt, "base64url"),
      expected.length,
    )) as Buffer;
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }
}
