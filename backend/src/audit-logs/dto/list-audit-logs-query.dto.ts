import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class ListAuditLogsQueryDto {
    @ApiPropertyOptional({ example: "USER" })
    @IsOptional()
    @IsString()
    actorType?: string;

    @ApiPropertyOptional({ example: "POST" })
    @IsOptional()
    @IsString()
    entityType?: string;

    @ApiPropertyOptional({ example: "user-id-123" })
    @IsOptional()
    @IsString()
    entityId?: string;

    @ApiPropertyOptional({ example: "APPROVE_POST" })
    @IsOptional()
    @IsString()
    action?: string;

    @ApiPropertyOptional({ example: "correlation-id-xyz" })
    @IsOptional()
    @IsString()
    correlationId?: string;

    @ApiPropertyOptional({ example: "2026-10-01T00:00:00Z" })
    @IsOptional()
    @IsString()
    fromDate?: string;

    @ApiPropertyOptional({ example: "2026-10-31T23:59:59Z" })
    @IsOptional()
    @IsString()
    toDate?: string;

    @ApiPropertyOptional({ example: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @ApiPropertyOptional({ example: 20, default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit = 20;
}