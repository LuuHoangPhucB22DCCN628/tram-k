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
        if (process.env.JOBS_ENABLED === 'false') return;
        const now = new Date();

        const dueContents = await this.prisma.content.findMany({
            where: {
                status: ContentStatus.SCHEDULED,
                publishAt: { lte: now },
                deletedAt: null,
            },
        });

        if (dueContents.length === 0) return;

        for (const content of dueContents) {
            try {
                await this.prisma.$transaction(async (transaction) => {
                    if (!content.sourceId || !content.reviewedAt || !content.nextReviewAt || new Date(content.nextReviewAt) <= now) {
                        await transaction.content.update({
                            where: { id: content.id },
                            data: {
                                status: ContentStatus.DRAFT,
                                publishAt: null,
                                publishFailureReason: "Thất bại: Hết hạn rà soát hoặc thiếu nguồn y tế."
                            },
                        });
                        await transaction.auditLog.create({
                            data: {
                                actorType: "SYSTEM",
                                action: "FAILED_SCHEDULED_PUBLISH",
                                entityType: "CONTENT",
                                entityId: content.id,
                                after: { status: ContentStatus.DRAFT },
                                reason: "Hết hạn rà soát",
                                correlationId: randomUUID(),
                            },
                        });
                        this.logger.warn(`Hủy lịch xuất bản ${content.id} do hết hạn rà soát.`);
                        return;
                    }

                    await transaction.content.update({
                        where: { id: content.id },
                        data: {
                            status: ContentStatus.PUBLISHED,
                            publishedAt: now,
                            version: { increment: 1 }
                        },
                    });

                    await transaction.auditLog.create({
                        data: {
                            actorType: "SYSTEM",
                            action: "SCHEDULED_PUBLISH_SUCCESS",
                            entityType: "CONTENT",
                            entityId: content.id,
                            after: { status: ContentStatus.PUBLISHED },
                            correlationId: randomUUID(),
                        },
                    });
                    this.logger.log(`Tự động xuất bản thành công nội dung ${content.id}`);
                });
            } catch (error) {
                this.logger.error(`Lỗi kỹ thuật khi xuất bản ${content.id}, sẽ thử lại sau.`, error);
            }
        }
    }
}