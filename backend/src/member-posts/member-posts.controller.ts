import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { CreateMemberPostDto } from "./dto/create-member-post.dto";
import { ReviewMemberPostDto } from "./dto/review-member-post.dto";
import { MemberPostsService } from "./member-posts.service";

@ApiTags("member posts")
@Controller("member-posts")
export class MemberPostsController {
  constructor(private readonly posts: MemberPostsService) {}

  @Get("public")
  async publicPosts(): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.posts.listPublic() };
  }

  @Get("mine")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async mine(@CurrentUser() user: AuthenticatedUser): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.posts.listMine(user.id) };
  }

  @Get("admin")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async admin(@CurrentUser() user: AuthenticatedUser): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.posts.listAdmin(user.id) };
  }

  @Post("mine")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMemberPostDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.posts.create(user.id, dto) };
  }

  @Patch("mine/:postId/submit")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param("postId") postId: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.posts.submit(user.id, postId) };
  }

  @Delete("mine/:postId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("postId") postId: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.posts.remove(user.id, postId) };
  }

  @Patch("admin/:postId/review")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param("postId") postId: string,
    @Body() dto: ReviewMemberPostDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.posts.review(user.id, postId, dto) };
  }
}
