import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateProgramDto {
    @ApiProperty({ example: "Chiến dịch hiến máu nhân đạo" })
    @IsString()
    @MinLength(5)
    @MaxLength(150)
    title!: string;

    @ApiProperty({ example: "Chi tiết chương trình..." })
    @IsString()
    @MinLength(50)
    @MaxLength(10000)
    description!: string;

    @ApiProperty()
    @IsString()
    @MaxLength(255)
    address!: string;

    @ApiProperty()
    @Min(-90) @Max(90)
    latitude!: number;

    @ApiProperty()
    @Min(-180) @Max(180)
    longitude!: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    conditions?: string;

    @ApiProperty()
    @IsDateString()
    registrationOpenAt!: string;

    @ApiProperty()
    @IsDateString()
    registrationCloseAt!: string;

    @ApiProperty()
    @IsDateString()
    startAt!: string;

    @ApiProperty()
    @IsDateString()
    endAt!: string;

    @ApiProperty({ example: 100 })
    @IsInt()
    @Min(1)
    @Max(100000)
    capacity!: number;
}