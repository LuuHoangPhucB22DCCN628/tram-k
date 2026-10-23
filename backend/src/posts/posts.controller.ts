import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { PostsService } from "./posts.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { ReviewPostDto } from "./dto/review-post.dto";
import { Idempotent } from "../common/idempotency.interceptor";

@ApiTags("posts")
@Controller("posts")
export class PostsController {
    constructor(private readonly posts: PostsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Idempotent("CREATE_POST")
    async create(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreatePostDto,
    ): Promise<ApiSuccessResponse<unknown>> {
        return { success: true, data: await this.posts.create(user.id, dto) };
    }

    @Post(":id/submit")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Idempotent("SUBMIT_POST")
    async submit(
        @CurrentUser() user: AuthenticatedUser,
        @Param("id") id: string,
    ): Promise<ApiSuccessResponse<unknown>> {
        return { success: true, data: await this.posts.submitForReview(user.id, id) };
    }

    @Post(":id/review")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Idempotent("REVIEW_POST")
    async review(
        @CurrentUser() admin: AuthenticatedUser,
        @Param("id") id: string,
        @Body() dto: ReviewPostDto,
    ): Promise<ApiSuccessResponse<unknown>> {
        return { success: true, data: await this.posts.review(admin.id, id, dto) };
    }
}