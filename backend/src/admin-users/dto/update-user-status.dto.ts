import { Transform } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { UserStatus } from "@prisma/client";

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  expectedStatus!: UserStatus;

  @IsInt()
  @Min(1)
  expectedAuthVersion!: number;

  @IsEnum(UserStatus)
  status!: UserStatus;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;
}
