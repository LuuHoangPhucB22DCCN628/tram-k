import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { AdminUsersService } from "./admin-users.service";
import { ListAdminUsersDto } from "./dto/list-admin-users.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

@ApiTags("admin-users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  async list(
    @CurrentUser() admin: AuthenticatedUser,
    @Query() query: ListAdminUsersDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.users.list(admin.id, query) };
  }

  @Patch(":userId/status")
  async updateStatus(
    @CurrentUser() admin: AuthenticatedUser,
    @Param("userId") userId: string,
    @Body() dto: UpdateUserStatusDto,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.users.updateStatus(admin.id, userId, dto, {
        ipHash: null,
        correlationId,
      }),
    };
  }
}
