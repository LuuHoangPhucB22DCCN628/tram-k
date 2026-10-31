import { HairRegistrationMode, HairRegistrationStatus } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class ListHairRegistrationsDto {
  @IsOptional()
  @IsEnum(HairRegistrationMode)
  mode?: HairRegistrationMode;

  @IsOptional()
  @IsEnum(HairRegistrationStatus)
  status?: HairRegistrationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
