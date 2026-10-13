import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthTokenPurpose, UserStatus } from "@prisma/client";
import { randomUUID } from "crypto";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class UnverifiedAccountCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UnverifiedAccountCleanupService.name);
  private readonly enabled: boolean;
  private readonly intervalMs: number;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.enabled = config.get<boolean>("AUTH_JOBS_ENABLED", true);
    this.intervalMs = config.get<number>("ACCOUNT_CLEANUP_INTERVAL_MS", 60 * 60 * 1000);
  }

  onModuleInit(): void {
    if (!this.enabled) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async cleanupExpired(limit = 100): Promise<number> {
    const now = new Date();
    const users = await this.prisma.user.findMany({
      where: {
        status: UserStatus.PENDING_VERIFY,
        deletedAt: null,
        verificationCleanupAt: { lte: now },
      },
      select: { id: true },
      orderBy: { verificationCleanupAt: "asc" },
      take: limit,
    });

    for (const user of users) {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            deletedAt: now,
            verificationCleanupAt: null,
            loginBlockedUntil: null,
            authVersion: { increment: 1 },
          },
        }),
        this.prisma.authToken.updateMany({
          where: {
            userId: user.id,
            purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
            usedAt: null,
            revokedAt: null,
          },
          data: { revokedAt: now },
        }),
        this.prisma.authSession.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: now },
        }),
        this.prisma.auditLog.create({
          data: {
            actorType: "SYSTEM",
            action: "SOFT_DELETE_UNVERIFIED_ACCOUNT",
            entityType: "USER",
            entityId: user.id,
            before: { status: UserStatus.PENDING_VERIFY, deletedAt: null },
            after: { status: UserStatus.PENDING_VERIFY, deletedAt: now.toISOString() },
            reason: "UNVERIFIED_ACCOUNT_RETENTION_EXPIRED",
            correlationId: randomUUID(),
          },
        }),
      ]);
    }
    return users.length;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.cleanupExpired();
    } catch (error) {
      this.logger.error(
        "Không thể dọn tài khoản chưa xác minh.",
        error instanceof Error ? error.message : "Unknown cleanup error",
      );
    } finally {
      this.running = false;
    }
  }
}
