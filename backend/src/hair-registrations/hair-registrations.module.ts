import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";

import { HairRegistrationsController } from "./hair-registrations.controller";
import { HairRegistrationsService } from "./hair-registrations.service";

@Module({
  imports: [NotificationsModule],
  controllers: [HairRegistrationsController],
  providers: [HairRegistrationsService],
})
export class HairRegistrationsModule {}
