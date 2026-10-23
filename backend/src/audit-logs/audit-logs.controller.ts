import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { AuditLogsService } from "./audit-logs.service";
import { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";

@ApiTags("admin-audit-logs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("admin/audit-logs")
export class AuditLogsController {
    constructor(private readonly auditLogs: AuditLogsService) { }

    @Get()
    async list(
        @CurrentUser() user: AuthenticatedUser,
        @Query() query: ListAuditLogsQueryDto,
    ): Promise<ApiSuccessResponse<unknown>> {
        return { success: true, data: await this.auditLogs.list(user, query) };
    }
}