import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString, MaxLength, MinLength } from "class-validator";
import { ModerationTargetType } from "@prisma/client";

export class CreateReportDto {
    @ApiProperty({ enum: ModerationTargetType })
    @IsEnum(ModerationTargetType)
    targetType!: ModerationTargetType;

    @ApiProperty()
    @IsString()
    @MinLength(1)
    @MaxLength(40)
    targetId!: string;

    @ApiProperty({ example: "SPAM" })
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    reasonCode!: string;

    @ApiProperty({ required: false })
    @IsString()
    @MaxLength(500)
    details?: string;

    @ApiProperty()
    @IsString()
    @MinLength(8)
    @MaxLength(100)
    idempotencyKey!: string;
}