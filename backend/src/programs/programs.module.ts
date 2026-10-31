import { Module } from "@nestjs/common";
import { ProgramsController } from "./programs.controller";
import { ProgramsService } from "./programs.service";
import { ProgramsScheduler } from "./programs.scheduler";

@Module({
    controllers: [ProgramsController],
    providers: [ProgramsService, ProgramsScheduler],
    exports: [ProgramsService],
})
export class ProgramsModule { }