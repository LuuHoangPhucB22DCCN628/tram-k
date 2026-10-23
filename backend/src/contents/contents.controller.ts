import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SearchDocumentType } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { ContentsService } from "./contents.service";
import { CreateContentDto } from "./dto/create-content.dto";
import { PublishContentDto } from "./dto/publish-content.dto";

@ApiTags("contents")
@Controller("contents")
export class ContentsController {
    constructor(private readonly contents: ContentsService) { }

    @Get("public")
    async listPublic(
        @Query("type") type?: SearchDocumentType,
        @Query("page") page = 1,
        @Query("limit") limit = 12,
    ): Promise<ApiSuccessResponse<unknown>> {
        return { success: true, data: await this.contents.listPublic(type, page, limit) };
    }

    @Post()
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    async create(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateContentDto,
    ): Promise<ApiSuccessResponse<unknown>> {
        return { success: true, data: await this.contents.create(user, dto) };
    }

    @Post(":id/publish")
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    async publish(
        @CurrentUser() user: AuthenticatedUser,
        @Param("id") id: string,
        @Body() dto: PublishContentDto,
    ): Promise<ApiSuccessResponse<unknown>> {
        return { success: true, data: await this.contents.publish(user, id, dto) };
    }
}