import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SupportProgramRegistrationsController } from "./support-program-registrations.controller";
import { SupportProgramRegistrationsService } from "./support-program-registrations.service";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [SupportProgramRegistrationsController],
  providers: [SupportProgramRegistrationsService],
})
export class SupportProgramRegistrationsModule {}
