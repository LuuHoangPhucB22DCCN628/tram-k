import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ProfilesService } from "./profiles.service";
import { Idempotent } from "../common/idempotency.interceptor";

@ApiTags("profiles")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("profile")
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) { }

  @Get("me")
  async getOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.profiles.getOwnProfile(user.id) };
  }

  @Patch("me")
  @Idempotent("UPDATE_PROFILE")
  async updateOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
    @Req() request: Request,
  ): Promise<ApiSuccessResponse<unknown>> {
    const correlationHeader = request.headers["x-correlation-id"];
    return {
      success: true,
      data: await this.profiles.updateOwnProfile(user.id, dto, {
        ip: request.ip,
        correlationId: Array.isArray(correlationHeader)
          ? correlationHeader[0]
          : correlationHeader,
      }),
    };
  }
}
