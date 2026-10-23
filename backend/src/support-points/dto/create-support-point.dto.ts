import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateSupportPointDto {
    @ApiProperty({ example: "Nhà thuốc An Tâm" })
    @IsString()
    @MinLength(3)
    @MaxLength(150)
    name!: string;

    @ApiProperty({ example: "Hỗ trợ phát thuốc miễn phí..." })
    @IsString()
    @MinLength(50)
    @MaxLength(1000)
    description!: string;

    @ApiProperty({ example: "123 Đường ABC, Quận 1" })
    @IsString()
    @MaxLength(255)
    address!: string;

    @ApiProperty({ example: 10.762622 })
    @IsNumber()
    @Min(-90) @Max(90)
    latitude!: number;

    @ApiProperty({ example: 106.660172 })
    @IsNumber()
    @Min(-180) @Max(180)
    longitude!: number;

    @ApiPropertyOptional({ example: "028 1234 5678" })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    contactPhone?: string;

    @ApiPropertyOptional({ example: "contact@antam.vn" })
    @IsOptional()
    @IsEmail()
    contactEmail?: string;

    @ApiPropertyOptional({ example: "8:00 - 17:00 (T2 - T6)" })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    operatingHours?: string;

    @ApiProperty({ example: "MEDICINE" })
    @IsString()
    @MaxLength(50)
    supportType!: string;
}