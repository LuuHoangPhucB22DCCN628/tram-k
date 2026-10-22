import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
  Res,
  HttpException
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
import { ListCommunityCommentsQueryDto } from "./dto/list-community-comments-query.dto";
import { Response } from "express";

@ApiTags("community engagement")
@Controller("community/stories")
export class CommunityEngagementController {
  constructor(private readonly engagement: CommunityEngagementService) { }

  @Get(":sourceKey/comments")
  async listComments(
    @Param() params: CommunitySourceKeyParamDto,
    @Query() query: ListCommunityCommentsQueryDto
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.engagement.listComments(
        params.sourceKey,
        query.page,
        query.limit
      )
    };
  }

  @Get(":sourceKey/comments/:commentId/replies")
  async listReplies(
    @Param() param: CommunitySourceKeyParamDto,
    @Param("commentId") commentId: string,
    @Query() query: ListCommunityCommentsQueryDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.engagement.listReplies(
        param.sourceKey,
        commentId,
        query.page,
        query.limit
      )
    };
  }

  @Get(":sourceKey/reactions")
  async reactionSummary(
    @Param() params: CommunitySourceKeyParamDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.engagement.reactionSummary(params.sourceKey) };
  }

  @Post(":sourceKey/comments")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CommunitySourceKeyParamDto,
    @Body() dto: CreateCommunityCommentBodyDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiSuccessResponse<unknown>> {
    try {
      return {
        success: true,
        data: await this.engagement.createComment(user, {
          ...dto,
          sourceKey: params.sourceKey,
        }),
      };
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() == 429) {
        res.setHeader("Retry-After", "60");
      }
      throw error;
    }
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
}
