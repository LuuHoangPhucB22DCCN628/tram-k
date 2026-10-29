import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ContentStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ContentsScheduler {
    private readonly logger = new Logger(ContentsScheduler.name);

    constructor(private readonly prisma: PrismaService) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async handleScheduledPublish() {
        if (process.env.JOBS_ENABLED === "false") return;
        const now = new Date();

        const dueContents = await this.prisma.content.findMany({
            where: { status: ContentStatus.SCHEDULED, publishAt: { lte: now }, deletedAt: null },
        });

        for (const content of dueContents) {
            try {
                await this.prisma.$transaction(async (transaction) => {
                    // CAS: Chỉ update nếu trạng thái vẫn là SCHEDULED
                    const claim = await transaction.content.updateMany({
                        where: {
                            id: content.id,
                            status: ContentStatus.SCHEDULED,
                            publishAt: { lte: now },
                            sourceId: { not: null },
                            reviewedById: { not: null },
                            reviewedAt: { not: null, lte: now },
                            nextReviewAt: { gt: now },
                        },
                        data: {
                            status: ContentStatus.PUBLISHED,
                            publishedAt: now,
                            version: { increment: 1 }
                        },
                    });

                    if (claim.count === 0) {
                        await transaction.content.updateMany({
                            where: {
                                id: content.id,
                                status: ContentStatus.SCHEDULED,
                                publishAt: { lte: now }
                            },
                            data: {
                                status: ContentStatus.DRAFT,
                                publishAt: null,
                                publishFailureReason: "Thất bại: Hết hạn rà soát hoặc thiếu nguồn y tế.",
                                version: { increment: 1 }
                            }
                        });
                        return;
                    }

                    const isSuccess = content.nextReviewAt && new Date(content.nextReviewAt) > now;
                    await transaction.auditLog.create({
                        data: {
                            actorType: "SYSTEM",
                            action: isSuccess ? "SCHEDULED_PUBLISH_SUCCESS" : "FAILED_SCHEDULED_PUBLISH",
                            entityType: "CONTENT",
                            entityId: content.id,
                            after: { status: isSuccess ? ContentStatus.PUBLISHED : ContentStatus.DRAFT },
                            reason: isSuccess ? null : "Hết hạn rà soát",
                            correlationId: randomUUID(),
                        },
                    });
                });
            } catch (error) {
                this.logger.error(`Lỗi kỹ thuật khi xuất bản ${content.id}`, error);
            }
        }
    }
}