import { Module } from "@nestjs/common";
import { SupportPointsController } from "./support-points.controller";
import { SupportPointsService } from "./support-points.service";

@Module({
    controllers: [SupportPointsController],
    providers: [SupportPointsService],
    exports: [SupportPointsService],
})
export class SupportPointsModule { }