import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreatePostDto {
    @ApiProperty({ example: "Hành trình chiến thắng bệnh ung thư" })
    @IsString()
    @MinLength(10)
    @MaxLength(150)
    title!: string;

    @ApiProperty({ example: "Câu chuyện của tôi..." })
    @IsString()
    @MinLength(50)
    @MaxLength(20000)
    body!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    summary?: string;

    @ApiProperty({ description: "Idempotency key" })
    @IsString()
    @MinLength(8)
    @MaxLength(100)
    idempotencyKey!: string;
}