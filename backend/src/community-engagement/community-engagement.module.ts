import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";

import { CommunityEngagementService } from "./community-engagement.service";
import { CommunityEngagementController } from "./community-engagement.controller";

@Module({
  imports: [NotificationsModule],
  controllers: [CommunityEngagementController],
  providers: [CommunityEngagementService],
  exports: [CommunityEngagementService],
})
export class CommunityEngagementModule {}
