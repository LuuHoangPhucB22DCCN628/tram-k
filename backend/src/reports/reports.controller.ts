import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { ReportsService } from "./reports.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { ReviewReportDto } from "./dto/review-report.dto";

@ApiTags("reports")
@Controller("reports")
export class ReportsController {
    constructor(private readonly reports: ReportsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async create(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateReportDto,
    ): Promise<ApiSuccessResponse<unknown>> {
        return { success: true, data: await this.reports.create(user.id, dto) };
    }

    @Post(":id/review")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async review(
        @CurrentUser() admin: AuthenticatedUser,
        @Param("id") id: string,
        @Body() dto: ReviewReportDto,
    ): Promise<ApiSuccessResponse<unknown>> {
        return { success: true, data: await this.reports.review(admin.id, id, dto) };
    }
}