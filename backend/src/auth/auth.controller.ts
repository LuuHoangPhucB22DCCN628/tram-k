import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";

import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { AuthenticatedUser } from "./auth-user.interface";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RequestEmailChangeDto } from "./dto/request-email-change.dto";
import { ResendVerificationDto } from "./dto/resend-verification.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailChangeDto } from "./dto/verify-email-change.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  private readonly refreshCookieName = "tram_k_refresh";

  constructor(private readonly auth: AuthService) { }

  @Post("register")
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
  ): Promise<ApiSuccessResponse<unknown>> {
    const result = await this.auth.register(dto, this.requestContext(request));
    return { success: true, data: result };
  }

  @Post("verify-email")
  @HttpCode(200)
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() request: Request,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.auth.verifyEmail(
        dto.token,
        this.requestContext(request),
      ),
    };
  }

  @Post("resend-verification")
  @HttpCode(202)
  async resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.auth.resendVerification(dto.email),
    };
  }

  @Post("forgot-password")
  @HttpCode(202)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() request: Request,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.auth.requestPasswordReset(
        dto.email,
        this.requestContext(request),
      ),
    };
  }

  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() request: Request,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.auth.resetPassword(dto, this.requestContext(request)),
    };
  }

  @Post("email-change/request")
  @HttpCode(202)
  @UseGuards(JwtAuthGuard)
  async requestEmailChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestEmailChangeDto,
    @Req() request: Request,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.auth.requestEmailChange(
        user.id,
        dto,
        this.requestContext(request),
      ),
    };
  }

  @Post("email-change/verify")
  @HttpCode(200)
  async verifyEmailChange(
    @Body() dto: VerifyEmailChangeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccessResponse<unknown>> {
    const result = await this.auth.verifyEmailChange(
      dto.token,
      this.requestContext(request),
    );
    response.clearCookie(this.refreshCookieName, { path: "/auth" });
    return { success: true, data: result };
  }

  @Post("login")
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccessResponse<unknown>> {
    const result = await this.auth.login(dto, this.requestContext(request));
    this.writeRefreshCookie(
      response,
      await this.auth.createRefreshSession(result.user.id, result.user.role),
      this.auth.refreshTtlMs(result.user.role),
    );
    return { success: true, data: result };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccessResponse<unknown>> {
    const refreshToken = this.readRefreshCookie(request);
    if (!refreshToken)
      throw new UnauthorizedException("Không tìm thấy phiên đăng nhập.");
    const refreshed = await this.auth.refresh(refreshToken);
    this.writeRefreshCookie(
      response,
      refreshed.refreshToken,
      this.auth.refreshTtlMs(refreshed.result.user.role),
    );
    return { success: true, data: refreshed.result };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccessResponse<null>> {
    const refreshToken = this.readRefreshCookie(request);
    if (refreshToken) await this.auth.revokeRefreshSession(refreshToken);
    response.clearCookie(this.refreshCookieName, { path: "/auth" });
    return { success: true, data: null };
  }

  @Post("logout-all")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccessResponse<unknown>> {
    const result = await this.auth.revokeAllRefreshSessions(
      user.id,
      this.requestContext(request),
    );
    response.clearCookie(this.refreshCookieName, { path: "/auth" });
    return { success: true, data: result };
  }

  private writeRefreshCookie(
    response: Response,
    refreshToken: string,
    maxAge: number,
  ): void {
    response.cookie(this.refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth",
      maxAge,
    });
  }

  private readRefreshCookie(request: Request): string | null {
    const cookie = request.headers.cookie
      ?.split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${this.refreshCookieName}=`));
    if (!cookie) return null;
    const value = cookie.slice(this.refreshCookieName.length + 1);
    return value ? decodeURIComponent(value) : null;
  }

  private requestContext(request: Request) {
    const correlationHeader = request.headers["x-correlation-id"];
    return {
      ip: request.ip,
      correlationId: Array.isArray(correlationHeader)
        ? correlationHeader[0]
        : correlationHeader,
    };
  }
}
