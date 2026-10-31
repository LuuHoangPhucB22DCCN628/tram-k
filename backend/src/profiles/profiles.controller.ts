import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";

import { AuthService } from "../auth/auth.service";
import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ProfilesService } from "./profiles.service";

@ApiTags("profiles")
@ApiBearerAuth()
@Controller("profile")
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly auth: AuthService,
  ) {}

  @Get("public/:userId")
  async getSharedProfile(
    @Param("userId") userId: string,
    @Req() request: Request,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.profiles.getSharedProfile(
        userId,
        await this.viewerId(request),
      ),
    };
  }

  @Get("avatar/:userId")
  async getSharedAvatar(
    @Param("userId") userId: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const avatar = await this.profiles.getSharedAvatar(
      userId,
      await this.viewerId(request),
    );
    response.setHeader("Cache-Control", "private, no-store");
    response.type(avatar.mimeType).send(avatar.bytes);
  }

  private async viewerId(request: Request): Promise<string | null> {
    const authorization = request.headers.authorization;
    return authorization?.startsWith("Bearer ")
      ? (await this.auth.authenticate(authorization.slice(7))).id
      : null;
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.profiles.getOwnProfile(user.id) };
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
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
