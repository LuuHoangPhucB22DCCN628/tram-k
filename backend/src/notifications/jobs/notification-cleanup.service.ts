import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class NotificationCleanupService {
    private readonly logger = new Logger(NotificationCleanupService.name);

    constructor(private readonly prisma: PrismaService) { }

    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async cleanupOldNotifications() {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        try {
            const result = await this.prisma.notification.deleteMany({
                where: { createdAt: { lt: ninetyDaysAgo }, },
            });

            if (result.count > 0) {
                this.logger.log(`Đã dọn dẹp ${result.count} thông báo cũ hơn 90 ngày.`);
            }
        } catch (error) {
            this.logger.error("Lỗi khi dọn dẹp thông báo cũ", error);
        }
    }
}