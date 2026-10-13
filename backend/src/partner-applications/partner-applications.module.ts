import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { PartnerApplicationsService } from "./partner-applications.service";
import { PartnerApplicationDocumentsService } from "./partner-application-documents.service";
import { PartnerApplicationsController } from "./partner-applications.controller";

@Module({
  imports: [NotificationsModule],
  controllers: [PartnerApplicationsController],
  providers: [PartnerApplicationsService, PartnerApplicationDocumentsService],
  exports: [PartnerApplicationsService],
})
export class PartnerApplicationsModule {}
