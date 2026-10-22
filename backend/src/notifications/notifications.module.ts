import { Module } from "@nestjs/common";

import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationCleanupService } from "./jobs/notification-cleanup.service";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationCleanupService],
  exports: [NotificationsService],
})
export class NotificationsModule { }
