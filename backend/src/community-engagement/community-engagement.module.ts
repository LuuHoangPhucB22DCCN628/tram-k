import { Module } from "@nestjs/common";

import { CommunityEngagementService } from "./community-engagement.service";
import { CommunityEngagementController } from "./community-engagement.controller";

@Module({
  controllers: [CommunityEngagementController],
  providers: [CommunityEngagementService],
  exports: [CommunityEngagementService],
})
export class CommunityEngagementModule {}
