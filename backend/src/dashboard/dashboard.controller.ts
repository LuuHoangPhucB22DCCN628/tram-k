import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { DashboardService } from "./dashboard.service";
import { DashboardQueryDto } from "./dto/dashboard-query.dto";

@ApiTags("admin-dashboard")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("admin/dashboard")
export class DashboardController {
    constructor(private readonly dashboard: DashboardService) { }

    @Get()
    async getOverview(
        @CurrentUser() user: AuthenticatedUser,
        @Query() query: DashboardQueryDto,
    ): Promise<ApiSuccessResponse<unknown>> {
        return { success: true, data: await this.dashboard.getOverview(query) };
    }
}