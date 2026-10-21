import { IsEnum, IsString, Length, MaxLength, MinLength } from "class-validator";
import { PartnerStatus } from "@prisma/client";
import { Transform } from "class-transformer";

export class ChangePartnerStatusDto {
    @IsEnum(PartnerStatus)
    expectedStatus!: PartnerStatus;

    @IsEnum(PartnerStatus)
    status!: PartnerStatus;

    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @MinLength(10)
    @MaxLength(1000)
    reason!: string;
}