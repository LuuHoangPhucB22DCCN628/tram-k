import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { CommunityEngagementService } from "./community-engagement.service";
import { CommunitySourceKeyParamDto } from "./dto/community-source-key-param.dto";
import { CreateCommunityCommentBodyDto } from "./dto/create-community-comment-body.dto";
import { ToggleCommunityReactionBodyDto } from "./dto/toggle-community-reaction-body.dto";
import { UpdateCommunityCommentDto } from "./dto/update-community-comment.dto";

@ApiTags("community engagement")
@Controller("community/stories")
export class CommunityEngagementController {
  constructor(private readonly engagement: CommunityEngagementService) {}

  @Get("mine/comments")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async myComments(@CurrentUser() user: AuthenticatedUser): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.engagement.listMineComments(user.id) };
  }

  @Get("admin/comments")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async adminComments(@CurrentUser() user: AuthenticatedUser): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.engagement.listAdminComments(user.id) };
  }

  @Delete("admin/comments/:commentId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async moderateComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("commentId") commentId: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.engagement.moderateRemoveComment(user.id, commentId) };
  }

  @Get(":sourceKey/comments")
  async listComments(
    @Param() params: CommunitySourceKeyParamDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.engagement.listComments(params.sourceKey) };
  }

  @Get(":sourceKey/reactions")
  async reactionSummary(
    @Param() params: CommunitySourceKeyParamDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.engagement.reactionSummary(params.sourceKey) };
  }

  @Get(":sourceKey/reactions/mine")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async myReaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CommunitySourceKeyParamDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.engagement.myReaction(user.id, params.sourceKey) };
  }

  @Post(":sourceKey/comments")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CommunitySourceKeyParamDto,
    @Body() dto: CreateCommunityCommentBodyDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.engagement.createComment(user.id, {
        ...dto,
        sourceKey: params.sourceKey,
      }),
    };
  }

  @Patch("comments/:commentId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("commentId") commentId: string,
    @Body() dto: UpdateCommunityCommentDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.engagement.updateComment(user.id, commentId, dto),
    };
  }

  @Delete("comments/:commentId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async deleteComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("commentId") commentId: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.engagement.softDeleteComment(user.id, commentId),
    };
  }

  @Post(":sourceKey/reactions/toggle")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async toggleReaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CommunitySourceKeyParamDto,
    @Body() dto: ToggleCommunityReactionBodyDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.engagement.toggleReaction(user.id, {
        ...dto,
        sourceKey: params.sourceKey,
      }),
    };
  }

  @Post(":sourceKey/reactions/import")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async importReaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CommunitySourceKeyParamDto,
    @Body() dto: ToggleCommunityReactionBodyDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.engagement.importReaction(user.id, {
      ...dto, sourceKey: params.sourceKey,
    }) };
  }
}
