import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export enum ReportDecision {
    RESOLVE = "RESOLVE",
    DISMISS = "DISMISS",
}

export class ReviewReportDto {
    @ApiProperty({ enum: ReportDecision })
    @IsEnum(ReportDecision)
    decision!: ReportDecision;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MinLength(10)
    @MaxLength(1000)
    reason?: string;
}