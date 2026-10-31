import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class DashboardQueryDto {
    @ApiPropertyOptional({ example: 30, description: "Số ngày gần nhất (7, 30, 90)" })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    days?: number;

    @ApiPropertyOptional({ example: "2026-10-01T00:00:00Z" })
    @IsOptional()
    @IsString()
    fromDate?: string;

    @ApiPropertyOptional({ example: "2026-10-31T23:59:59Z" })
    @IsOptional()
    @IsString()
    toDate?: string;
}