import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { CreateProgramDto } from "./dto/create-program.dto";
import { ReviewProgramDto } from "./dto/review-program.dto";
import { ProgramsService } from "./programs.service";
import { Idempotent } from "../common/idempotency.interceptor";

@ApiTags("programs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("programs")
export class ProgramsController {
    constructor(private readonly programs: ProgramsService) { }

    @Post()
    @Idempotent("CREATE_PROGRAM")
    async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProgramDto) {
        return { success: true, data: await this.programs.create(user, dto) };
    }

    @Post(":id/submit")
    @Idempotent("SUBMIT_PROGRAM")
    async submit(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
        return { success: true, data: await this.programs.submit(user, id) };
    }

    @Patch(":id/review")
    @Idempotent("REVIEW_PROGRAM")
    async review(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ReviewProgramDto) {
        return { success: true, data: await this.programs.review(user, id, dto) };
    }
}