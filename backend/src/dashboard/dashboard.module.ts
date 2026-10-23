import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
    imports: [
        CacheModule.register({
            ttl: 300,
            max: 100,
        }),
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule { }