import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { CreateHairRegistrationDto } from "./dto/create-hair-registration.dto";
import { ListHairRegistrationsDto } from "./dto/list-hair-registrations.dto";
import { ReviewHairRegistrationDto } from "./dto/review-hair-registration.dto";
import {
  HairRegistrationsService,
  type HairRegistrationReceipt,
} from "./hair-registrations.service";
import { Idempotent } from "../common/idempotency.interceptor";

@ApiTags("Community")
@Controller("community/hair-registrations")
export class HairRegistrationsController {
  constructor(private readonly registrations: HairRegistrationsService) { }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Idempotent("CREATE_HAIR_REGISTRATION")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Tiếp nhận đăng ký nhận tóc hoặc hiến tóc" })
  @ApiCreatedResponse({ description: "Đăng ký đã được tiếp nhận và chờ xử lý" })
  async create(
    @Body() dto: CreateHairRegistrationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ApiSuccessResponse<HairRegistrationReceipt>> {
    return { success: true, data: await this.registrations.create(dto, actor) };
  }

  @Get("mine/:reference")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async lookupMine(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("reference") reference: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.registrations.lookupForOwner(actor, reference),
    };
  }

  @Get("admin")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async listForAdmin(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListHairRegistrationsDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.registrations.listForAdmin(actor, query),
    };
  }

  @Get("admin/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async detailForAdmin(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.registrations.detailForAdmin(actor, id),
    };
  }

  @Patch("admin/:id/status")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async reviewForAdmin(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ReviewHairRegistrationDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.registrations.reviewForAdmin(actor, id, dto),
    };
  }
}
