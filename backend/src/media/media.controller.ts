import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { MediaService } from "./media.service";
import { MediaKind, UploadedMediaFile } from "./media.types";

@ApiTags("media")
@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post("upload")
  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 30 * 1024 * 1024 } }),
  )
  async upload(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("kind") kind: string,
    @UploadedFile() file: UploadedMediaFile | undefined,
    @Req() request: Request,
  ): Promise<ApiSuccessResponse<unknown>> {
    if (kind !== "image" && kind !== "audio") {
      throw new BadRequestException("Loại tệp tải lên không hợp lệ.");
    }
    const stored = await this.media.store(actor, kind as MediaKind, file);
    const origin = `${request.protocol}://${request.get("host")}`;
    return {
      success: true,
      data: {
        ...stored,
        url: `${origin}/media/${stored.fileName}`,
      },
    };
  }

  @Get(":fileName")
  @Header("Cache-Control", "public, max-age=31536000, immutable")
  async download(@Param("fileName") fileName: string): Promise<StreamableFile> {
    const file = await this.media.load(fileName);
    return new StreamableFile(file.buffer, {
      type: file.mimeType,
      disposition: "inline",
      length: file.buffer.length,
    });
  }
}
