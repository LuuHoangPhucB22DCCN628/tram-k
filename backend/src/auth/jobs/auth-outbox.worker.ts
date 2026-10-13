import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OutboxStatus, Prisma } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthOutboxCryptoService } from "../auth-outbox-crypto.service";
import { VerificationEmailDeliveryService } from "./verification-email-delivery.service";

interface TokenEmailPayload {
  readonly recipient: string;
  readonly displayName: string;
  readonly encryptedToken: string;
}

@Injectable()
export class AuthOutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthOutboxWorker.name);
  private readonly enabled: boolean;
  private readonly intervalMs: number;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: AuthOutboxCryptoService,
    private readonly email: VerificationEmailDeliveryService,
    config: ConfigService,
  ) {
    this.enabled = config.get<boolean>("AUTH_JOBS_ENABLED", true);
    this.intervalMs = config.get<number>("OUTBOX_POLL_INTERVAL_MS", 5_000);
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

  async processBatch(limit = 10): Promise<number> {
    const now = new Date();
    const staleAt = new Date(now.getTime() - 10 * 60 * 1000);
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        type: {
          in: [
            "AUTH_EMAIL_VERIFICATION_REQUESTED",
            "AUTH_EMAIL_CHANGE_REQUESTED",
            "AUTH_PASSWORD_RESET_REQUESTED",
          ],
        },
        OR: [
          { status: OutboxStatus.PENDING, availableAt: { lte: now } },
          { status: OutboxStatus.PROCESSING, updatedAt: { lt: staleAt } },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    let processed = 0;
    for (const event of events) {
      const claimed = await this.prisma.outboxEvent.updateMany({
        where: {
          id: event.id,
          status: event.status,
          ...(event.status === OutboxStatus.PROCESSING
            ? { updatedAt: event.updatedAt }
            : {}),
        },
        data: {
          status: OutboxStatus.PROCESSING,
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      if (claimed.count !== 1) continue;

      try {
        const payload = this.readTokenEmailPayload(event.payload);
        const message = {
          recipient: payload.recipient,
          displayName: payload.displayName,
          token: this.crypto.decrypt(payload.encryptedToken),
        };
        if (event.type === "AUTH_PASSWORD_RESET_REQUESTED") {
          await this.email.sendPasswordReset(message);
        } else if (event.type === "AUTH_EMAIL_CHANGE_REQUESTED") {
          await this.email.sendEmailChange(message);
        } else {
          await this.email.sendVerification(message);
        }
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxStatus.SENT,
            sentAt: new Date(),
            lastError: null,
          },
        });
        processed += 1;
      } catch (error) {
        const attempts = event.attempts + 1;
        const terminal = attempts >= 5;
        const retryDelayMs = Math.min(
          30_000 * 2 ** (attempts - 1),
          60 * 60 * 1000,
        );
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: terminal ? OutboxStatus.FAILED : OutboxStatus.PENDING,
            availableAt: new Date(Date.now() + retryDelayMs),
            lastError: this.errorMessage(error),
          },
        });
      }
    }
    return processed;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.processBatch();
    } catch (error) {
      this.logger.error(
        "Không thể xử lý auth outbox.",
        this.errorMessage(error),
      );
    } finally {
      this.running = false;
    }
  }

  private readTokenEmailPayload(value: Prisma.JsonValue): TokenEmailPayload {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Invalid auth email payload.");
    }
    const recipient = value["recipient"];
    const displayName = value["displayName"];
    const encryptedToken = value["encryptedToken"];
    if (
      typeof recipient !== "string" ||
      typeof displayName !== "string" ||
      typeof encryptedToken !== "string"
    ) {
      throw new Error("Incomplete auth email payload.");
    }
    return { recipient, displayName, encryptedToken };
  }

  private errorMessage(error: unknown): string {
    return (
      error instanceof Error ? error.message : "Unknown outbox error"
    ).slice(0, 500);
  }
}
