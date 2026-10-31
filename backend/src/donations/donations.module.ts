import { Module } from "@nestjs/common";

import { AdminDonationsController, PublicDonationsController } from "./donations.controller";
import { DonationsService } from "./donations.service";

@Module({ controllers: [AdminDonationsController, PublicDonationsController], providers: [DonationsService] })
export class DonationsModule {}
