import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { CreateSupportPointDto } from "./dto/create-support-point.dto";
import { SupportPointsService } from "./support-points.service";
import { Idempotent } from "../common/idempotency.interceptor";

@ApiTags("support points")
@Controller("support-points")
export class SupportPointsController {
    constructor(private readonly service: SupportPointsService) { }

    @Get("map")
    async getMap(@Query("type") type?: string) {
        return { success: true, data: await this.service.listPublicMap(type) };
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Idempotent("CREATE_SUPPORT_POINT")
    async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSupportPointDto) {
        return { success: true, data: await this.service.create(user, dto) };
    }

    @Post(":id/submit")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Idempotent("SUBMIT_SUPPORT_POINT")
    async submit(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
        return { success: true, data: await this.service.submit(user, id) };
    }

    @Patch(":id/review")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Idempotent("REVIEW_SUPPORT_POINT")
    async review(
        @CurrentUser() user: AuthenticatedUser,
        @Param("id") id: string,
        @Body() body: { decision: "APPROVE" | "REJECT"; reason?: string }
    ) {
        return { success: true, data: await this.service.review(user, id, body.decision, body.reason) };
    }
}