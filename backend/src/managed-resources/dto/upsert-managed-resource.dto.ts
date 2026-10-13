import { ManagedResourceStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from "class-validator";

export class UpsertManagedResourceDto {
  @IsEnum(ManagedResourceStatus)
  status!: ManagedResourceStatus;

  @IsString()
  @Length(2, 160)
  title!: string;

  @IsString()
  @Length(2, 1000)
  description!: string;

  @IsString()
  @Length(1, 80)
  eyebrow!: string;

  @IsString()
  @Length(1, 255)
  metadata!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageAlt?: string;

  @IsString()
  @Length(1, 500)
  link!: string;

  @IsDateString()
  publishedAt!: string;

  @IsObject()
  @Type(() => Object)
  payload!: Record<string, unknown>;
}
