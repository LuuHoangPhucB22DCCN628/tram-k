import { Controller, Get, Param, ParseEnumPipe, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import {
  ListPublicContentCategoriesDto,
  ListPublicContentsDto,
  PUBLIC_CONTENT_KIND_ENUM,
  PublicContentKind,
} from "./dto/list-public-contents.dto";
import { PublicContentsService } from "./public-contents.service";

@ApiTags("public contents")
@Controller("public")
export class PublicContentsController {
  constructor(private readonly contents: PublicContentsService) {}

  @Get("contents")
  async list(
    @Query() query: ListPublicContentsDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.contents.list(query) };
  }

  @Get("contents/:kind/:slug")
  async getBySlug(
    @Param("kind", new ParseEnumPipe(PUBLIC_CONTENT_KIND_ENUM))
    kind: PublicContentKind,
    @Param("slug") slug: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.contents.getBySlug(kind, slug),
    };
  }

  @Get("content-categories")
  async categories(
    @Query() query: ListPublicContentCategoriesDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.contents.categories(query.kind),
    };
  }
}
