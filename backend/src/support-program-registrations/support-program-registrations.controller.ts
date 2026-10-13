import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { UpdateSupportProgramRegistrationDto } from "./dto/update-support-program-registration.dto";
import { SupportProgramRegistrationsService } from "./support-program-registrations.service";

@ApiTags("support program registrations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("support-program-registrations")
export class SupportProgramRegistrationsController {
  constructor(private readonly registrations: SupportProgramRegistrationsService) {}

  @Get("mine")
  async mine(@CurrentUser() actor: AuthenticatedUser): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.registrations.mine(actor) };
  }

  @Get("program/:programId")
  async forProgram(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("programId") programId: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.registrations.forProgram(actor, programId) };
  }

  @Post("program/:programId")
  async register(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("programId") programId: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.registrations.register(actor, programId) };
  }

  @Patch("program/:programId/member/:userId")
  async update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("programId") programId: string,
    @Param("userId") userId: string,
    @Body() dto: UpdateSupportProgramRegistrationDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.registrations.update(actor, programId, userId, dto) };
  }

  @Delete("program/:programId")
  async cancel(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("programId") programId: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.registrations.cancel(actor, programId) };
  }
}
