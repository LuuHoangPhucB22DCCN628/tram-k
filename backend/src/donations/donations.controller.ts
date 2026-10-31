import { Body, Controller, Get, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { DonationEntryStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { DonationsService } from "./donations.service";
import { StatementFile } from "./statement-parser";

@ApiTags("donations")
@Controller("donations")
export class PublicDonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Get("recent")
  async recent(@Query("limit") limit?: string, @Query("page") page?: string): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.donations.publicList(limit ? Number(limit) : 8, page ? Number(page) : 1) };
  }
}

@ApiTags("admin-donations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("admin/donations")
export class AdminDonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Post("inspect")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  async inspect(@CurrentUser() admin: AuthenticatedUser, @UploadedFile() file: StatementFile,
    @Body("sheet") sheet?: string): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.donations.inspect(admin.id, file, sheet) };
  }

  @Post("import")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  async import(@CurrentUser() admin: AuthenticatedUser, @UploadedFile() file: StatementFile,
    @Body("options") options: string): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.donations.import(admin.id, file, options) };
  }

  @Get()
  async list(@CurrentUser() admin: AuthenticatedUser,
    @Query("status") status?: DonationEntryStatus): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.donations.listAdmin(admin.id, status) };
  }

  @Post("review")
  async review(@CurrentUser() admin: AuthenticatedUser,
    @Body() body: { ids: string[]; status: DonationEntryStatus; note?: string }): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.donations.review(admin.id, body?.ids, body?.status, body?.note) };
  }
}
