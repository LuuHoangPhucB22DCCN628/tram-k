import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { SearchModule } from "../search/search.module";
import { ManagedResourcesController } from "./managed-resources.controller";
import { ManagedResourcesService } from "./managed-resources.service";
import { PublicContentsController } from "./public-contents.controller";
import { PublicContentsService } from "./public-contents.service";

@Module({
  imports: [AuthModule, SearchModule],
  controllers: [ManagedResourcesController, PublicContentsController],
  providers: [ManagedResourcesService, PublicContentsService],
})
export class ManagedResourcesModule {}
