import { Controller, Get, Param, StreamableFile, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ExportsService } from "./exports.service";

@ApiTags("admin-exports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("exports")
export class ExportsController {
    constructor(private readonly exports: ExportsService) { }

    @Get("programs/:programId/registrations")
    async exportRegistrations(
        @CurrentUser() actor: AuthenticatedUser,
        @Param("programId") programId: string,
    ): Promise<StreamableFile> {
        const { buffer, fileName } = await this.exports.exportProgramRegistrations(actor, programId);

        return new StreamableFile(buffer, {
            type: "text/csv",
            disposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
            length: buffer.length,
        });
    }
}