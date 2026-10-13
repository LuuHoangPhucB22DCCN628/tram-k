import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { SearchDocumentType } from "@prisma/client";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { ListManagedResourcesDto } from "./dto/list-managed-resources.dto";
import { UpsertManagedResourceDto } from "./dto/upsert-managed-resource.dto";
import { ManagedResourcesService } from "./managed-resources.service";

@ApiTags("managed-resources")
@Controller("managed-resources")
export class ManagedResourcesController {
  constructor(private readonly resources: ManagedResourcesService) {}

  @Get("public")
  async listPublished(
    @Query() query: ListManagedResourcesDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.resources.listPublished(query.type),
    };
  }

  @Get("public-state")
  async getPublicState(
    @Query() query: ListManagedResourcesDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.resources.publicState(query.type),
    };
  }

  @Get("admin-state")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getAdminState(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListManagedResourcesDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.resources.adminState(actor, query.type),
    };
  }

  @Get("mine")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getMine(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListManagedResourcesDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.resources.mine(actor, query.type),
    };
  }

  @Put(":type/:sourceId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async upsert(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("type", new ParseEnumPipe(SearchDocumentType))
    type: SearchDocumentType,
    @Param("sourceId") sourceId: string,
    @Body() dto: UpsertManagedResourceDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.resources.upsert(actor, type, sourceId, dto),
    };
  }

  @Delete(":type/:sourceId")
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("type", new ParseEnumPipe(SearchDocumentType))
    type: SearchDocumentType,
    @Param("sourceId") sourceId: string,
  ): Promise<void> {
    await this.resources.remove(actor, type, sourceId);
  }
}
