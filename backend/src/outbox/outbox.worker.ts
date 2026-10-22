import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { NotificationKind, OutboxStatus } from "@prisma/client";

const SUPPORTED_EVENT_TYPES = [
    "PARTNER_APPLICATION_REVIEWED",
    "PROGRAM_REGISTRATION_SENT",
    "PROGRAM_REGISTRATION_CONFIRMED",
];

@Injectable()
export class OutboxWorker {
    private readonly logger = new Logger(OutboxWorker.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notification: NotificationsService,
    ) { }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async processOutboxEvents() {
        const now = new Date();
        const staleAt = new Date(now.getTime() - 5 * 60 * 1000);

        const events = await this.prisma.outboxEvent.findMany({
            where: {
                type: { in: SUPPORTED_EVENT_TYPES },
                OR: [
                    { status: OutboxStatus.PENDING, availableAt: { lte: now } },
                    { status: OutboxStatus.PROCESSING, updatedAt: { lt: staleAt } },
                ],
            },
            take: 20,
            orderBy: { createdAt: "asc" },
        });

        if (events.length === 0) return;

        for (const event of events) {
            try {
                const claim = await this.prisma.outboxEvent.updateMany({
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

                if (claim.count !== 1) continue;

                if (event.type === "PARTNER_APPLICATION_REVIEWED") {
                    await this.handlePartnerApplicationReviewed(event);
                } else if (event.type === "PROGRAM_REGISTRATION_SENT") {
                    await this.handleProgramRegistrationSent(event);
                } else if (event.type === "PROGRAM_REGISTRATION_CONFIRMED") {
                    await this.handleProgramRegistrationConfirmed(event);
                }

                await this.prisma.outboxEvent.update({
                    where: { id: event.id },
                    data: { status: OutboxStatus.SENT, sentAt: new Date() },
                });
            } catch (error: any) {
                this.logger.error(`Lỗi xử lý event ${event.id}: ${error.message}`);
                const nextAttempt = event.attempts + 1;
                const isFatal = nextAttempt >= 5;

                const retryDelayMs = Math.min(30_000 * 2 ** (nextAttempt - 1), 60 * 60 * 1000);

                await this.prisma.outboxEvent.update({
                    where: { id: event.id },
                    data: {
                        status: isFatal ? OutboxStatus.FAILED : OutboxStatus.PENDING,
                        lastError: error.message,
                        availableAt: new Date(Date.now() + retryDelayMs),
                    },
                });
            }
        }
    }

    private async handlePartnerApplicationReviewed(event: any) {
        const payload = event.payload as {
            applicantId: string;
            status: string | null;
            reason: string;
            applicationId: string;
        };

        const isApproved = payload.status === "APPROVED";
        await this.notification.create({
            recipientId: payload.applicantId,
            kind: isApproved
                ? NotificationKind.PARTNER_APPLICATION_APPROVED
                : NotificationKind.PARTNER_APPLICATION_REJECTED,
            title: isApproved
                ? "Hồ sơ đối tác đã được duyệt"
                : "Hồ sơ đối tác cần chỉnh sửa",
            message: isApproved
                ? "Bạn đã được cấp quyền nhà hảo tâm và có thể đăng ký chương trình hỗ trợ."
                : `Hồ sơ chưa được duyệt. Lý do: ${payload.reason}`,
            link: isApproved
                ? "/doi-tac/ho-so"
                : "/thanh-vien/dang-ky-doi-tac",
            dedupeKey: `partner-application:${payload.applicationId}:${payload.status}`,
        });
    }

    private async handleProgramRegistrationSent(event: any) {
        const payload = event.payload as {
            recipientId: string;
            programId: string;
            programTitle: string;
            status: string;
            registrationVersion: number;
        };

        const isConfirmed = payload.status === "CONFIRMED";

        await this.notification.create({
            recipientId: payload.recipientId,
            kind: NotificationKind.PROGRAM_REGISTRATION_SENT,
            title: isConfirmed ? "Đăng ký thành công" : "Đã vào danh sách chờ",
            message: isConfirmed
                ? `Bạn đã đăng ký thành công chương trình "${payload.programTitle}".`
                : `Chương trình "${payload.programTitle}" đã đủ người. Bạn đã được thêm vào danh sách chờ.`,
            link: `/doi-tac/quan-ly-chuong-trinh?program=${encodeURIComponent(payload.programId)}&registration=${encodeURIComponent(payload.recipientId)}`,
            dedupeKey: `program-registration:${event.aggregateId}:received:v${payload.registrationVersion}`,
        });
    }

    private async handleProgramRegistrationConfirmed(event: any) {
        const payload = event.payload as {
            recipientId: string;
            programId: string;
            programTitle: string;
            registrationVersion?: number;
        };

        await this.notification.create({
            recipientId: payload.recipientId,
            kind: NotificationKind.PROGRAM_REGISTRATION_CONFIRMED,
            title: "Đăng ký được xác nhận",
            message: `Chúc mừng! Bạn đã được chuyển từ danh sách chờ sang danh sách chính thức tham gia chương trình "${payload.programTitle}" do có người hủy.`,
            link: `/thanh-vien/chuong-trinh-da-dang-ky?program=${encodeURIComponent(payload.programId)}`,
            dedupeKey: `program-registration:${event.aggregateId}:promoted:v${payload.registrationVersion}`,
        });
    }
}