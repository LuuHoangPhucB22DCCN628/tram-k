import { Module } from "@nestjs/common";

import { HairRegistrationsController } from "./hair-registrations.controller";
import { HairRegistrationsService } from "./hair-registrations.service";

@Module({
  controllers: [HairRegistrationsController],
  providers: [HairRegistrationsService],
})
export class HairRegistrationsModule {}
