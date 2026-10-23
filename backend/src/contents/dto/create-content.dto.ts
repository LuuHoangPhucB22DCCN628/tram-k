import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SearchDocumentType } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateContentDto {
    @ApiProperty({ example: "Cách chăm sóc bệnh nhân ung thư" })
    @IsString() @MinLength(10) @MaxLength(150)
    title!: string;

    @ApiProperty({ example: "cach-cham-soc-benh-nhan-ung-thu" })
    @IsString() @MinLength(3) @MaxLength(150)
    slug!: string;

    @ApiProperty({ enum: SearchDocumentType })
    @IsEnum(SearchDocumentType)
    type!: SearchDocumentType;

    @ApiPropertyOptional()
    @IsOptional() @IsString() @MaxLength(500)
    summary?: string;

    @ApiProperty({ example: "<p>Nội dung chi tiết...</p>" })
    @IsString() @MinLength(50)
    sanitizedBody!: string;

    @ApiPropertyOptional()
    @IsOptional() @IsString()
    sourceId?: string;

    @ApiPropertyOptional()
    @IsOptional() @IsString()
    reviewedById?: string;

    @ApiPropertyOptional()
    @IsOptional() @IsDateString()
    reviewedAt?: string;

    @ApiPropertyOptional()
    @IsOptional() @IsDateString()
    nextReviewAt?: string;
}