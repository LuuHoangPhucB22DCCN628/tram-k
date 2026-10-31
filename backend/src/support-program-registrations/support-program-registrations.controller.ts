import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { UpdateSupportProgramRegistrationDto } from "./dto/update-support-program-registration.dto";
import { SupportProgramRegistrationsService } from "./support-program-registrations.service";
import { Idempotent } from "../common/idempotency.interceptor";

@ApiTags("program registrations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("programs")
export class SupportProgramRegistrationsController {
  constructor(private readonly registrations: SupportProgramRegistrationsService) { }

  @Get("me/registrations")
  async mine(@CurrentUser() actor: AuthenticatedUser): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.registrations.mine(actor) };
  }

  @Get(":id/registrations")
  async forProgram(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") programId: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.registrations.forProgram(actor, programId) };
  }

  @Post(":id/registrations")
  @UseGuards(JwtAuthGuard)
  @Idempotent("REGISTER_PROGRAM")
  async register(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") programId: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.registrations.register(actor, programId) };
  }

  @Patch(":id/registrations/:registrationId/attendance")
  @Idempotent("UPDATE_ATTENDANCE")
  async update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") programId: string,
    @Param("registrationId") registrationId: string,
    @Body() dto: UpdateSupportProgramRegistrationDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.registrations.update(actor, programId, registrationId, dto) };
  }

  @Post("me/registrations/:id/cancel")
  @Idempotent("CANCEL_REGISTRATION")
  async cancel(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") programId: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.registrations.cancel(actor, programId) };
  }
}