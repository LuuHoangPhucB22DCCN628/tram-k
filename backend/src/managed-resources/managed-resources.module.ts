import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SearchModule } from "../search/search.module";
import { ManagedResourcesController } from "./managed-resources.controller";
import { ManagedResourcesService } from "./managed-resources.service";

@Module({
  imports: [AuthModule, SearchModule, NotificationsModule],
  controllers: [ManagedResourcesController],
  providers: [ManagedResourcesService],
})
export class ManagedResourcesModule {}
