import { ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class SavePartnerDraftDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(150)
    organizationName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    representativeName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Matches(/^(0|\+84)[0-9]{9,10}$/)
    phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MinLength(10)
    @MaxLength(300)
    address?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MinLength(30)
    @MaxLength(2000)
    introduction?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(5)
    @IsString({ each: true })
    documentKeys?: string[];
}