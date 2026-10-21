import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { UploadedMediaFile } from "../media/media.types";
import { ListPartnerApplicationsDto } from "./dto/list-partner-applications.dto";
import { ReviewPartnerApplicationDto } from "./dto/review-partner-application.dto";
import { SubmitPartnerApplicationDto } from "./dto/submit-partner-application.dto";
import { PartnerApplicationDocumentsService } from "./partner-application-documents.service";
import { PartnerApplicationsService } from "./partner-applications.service";
import { ChangePartnerStatusDto } from "./dto/change-partner-status.dto";

@ApiTags("partner applications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("partner-applications")
export class PartnerApplicationsController {
  constructor(
    private readonly applications: PartnerApplicationsService,
    private readonly documents: PartnerApplicationDocumentsService,
  ) { }

  @Get("mine")
  async mine(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.applications.findMine(actor.id) };
  }

  @Post("documents")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FilesInterceptor("documents", 10, {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadDocuments(
    @CurrentUser() actor: AuthenticatedUser,
    @UploadedFiles() files: UploadedMediaFile[] | undefined,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.documents.store(actor, files) };
  }

  @Get("documents/:storageKey")
  async downloadDocument(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("storageKey") storageKey: string,
  ): Promise<StreamableFile> {
    const file = await this.documents.load(actor, storageKey);
    return new StreamableFile(file.buffer, {
      type: file.document.mimeType,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.document.originalName)}`,
      length: file.buffer.length,
    });
  }

  @Post("mine")
  async submit(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: SubmitPartnerApplicationDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    await this.applications.submit(actor.id, dto);
    return {
      success: true,
      data: await this.applications.findMine(actor.id),
    };
  }

  @Get("admin")
  async listForAdmin(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListPartnerApplicationsDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.applications.listForAdmin(
        actor.id,
        query.status,
        query.page,
        query.limit,
      ),
    };
  }

  @Patch("admin/:applicationId/review")
  async review(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("applicationId") applicationId: string,
    @Body() dto: ReviewPartnerApplicationDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.applications.review(actor.id, applicationId, dto),
    };
  }

  @Patch("admin/users/:userId/status")
  async changePartnerStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("userId") userId: string,
    @Body() dto: ChangePartnerStatusDto,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.applications.changePartnerStatus(actor.id, userId, dto, correlationId),
    };
  }
}
