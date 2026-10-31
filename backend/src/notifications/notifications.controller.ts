import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";
import { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("preferences")
  async preferences(@CurrentUser() user: AuthenticatedUser): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.notifications.preferencesFor(user.id) };
  }

  @Patch("preferences")
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.notifications.updatePreferences(user.id, dto) };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.notifications.listFor(user.id, query) };
  }

  @Patch("read-all")
  async markAllRead(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.notifications.markAllRead(user.id) };
  }

  @Patch(":notificationId/read")
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param("notificationId") notificationId: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.notifications.markRead(user.id, notificationId),
    };
  }
}
