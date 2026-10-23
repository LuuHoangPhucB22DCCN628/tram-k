import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class UpdatePostDto {
    @ApiProperty()
    @IsString()
    @MinLength(10)
    @MaxLength(150)
    title!: string;

    @ApiProperty()
    @IsString()
    @MinLength(50)
    @MaxLength(20000)
    body!: string;

    @ApiProperty()
    @IsString()
    @MinLength(8)
    @MaxLength(100)
    idempotencyKey!: string;
}