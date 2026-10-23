import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export enum ReviewDecision {
    APPROVE = "APPROVE",
    REJECT = "REJECT",
}

export class ReviewPostDto {
    @ApiProperty({ enum: ReviewDecision })
    @IsEnum(ReviewDecision)
    decision!: ReviewDecision;

    @ApiPropertyOptional({ description: "Bắt buộc nếu REJECT" })
    @IsOptional()
    @IsString()
    @MinLength(10)
    @MaxLength(1000)
    reason?: string;
}