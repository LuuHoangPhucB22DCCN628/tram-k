import { Module } from "@nestjs/common";
import { ContentsController } from "./contents.controller";
import { ContentsService } from "./contents.service";
import { ContentsScheduler } from "./contents.scheduler";

@Module({
    controllers: [ContentsController],
    providers: [ContentsService, ContentsScheduler],
    exports: [ContentsService],
})
export class ContentsModule { }