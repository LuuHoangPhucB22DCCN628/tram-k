import { ProfileVisibility } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateProfileDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsString()
  @Length(2, 50)
  displayName!: string;

  @IsString()
  @Matches(/^(?:|0\d{9}|\+84\d{9})$/, {
    message: "Số điện thoại không đúng định dạng.",
  })
  phone!: string;

  @IsString()
  @MaxLength(100)
  city!: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(9999)
  birthYear!: number | null;

  @IsString()
  @MaxLength(500)
  bio!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_500_000)
  avatarDataUrl!: string | null;

  @IsEnum(ProfileVisibility)
  visibility!: ProfileVisibility;

  @IsBoolean()
  showEmail!: boolean;

  @IsBoolean()
  allowComments!: boolean;
}
