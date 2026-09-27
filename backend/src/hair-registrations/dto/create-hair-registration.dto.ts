import { Transform } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

const VIETNAMESE_PHONE = /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/;
const PERSON_NAME = /^[\p{L}][\p{L}\s'.-]*$/u;
const HAS_LETTER = /\p{L}/u;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateHairRegistrationDto {
  @IsIn(["receive", "donate"])
  mode: "receive" | "donate";

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(PERSON_NAME)
  fullName: string;

  @Transform(trim)
  @Matches(VIETNAMESE_PHONE)
  phone: string;

  @Transform(trim)
  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(60)
  @Matches(HAS_LETTER)
  province: string;

  @Transform(trim)
  @IsString()
  @MaxLength(60)
  @Matches(HAS_LETTER)
  district: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(180)
  address: string;

  @IsIn(["female", "male", "other"])
  gender: "female" | "male" | "other";

  @ValidateIf((dto: CreateHairRegistrationDto) => dto.mode === "receive")
  @Transform(trim)
  @Matches(VIETNAMESE_PHONE)
  relativePhone?: string;

  @ValidateIf((dto: CreateHairRegistrationDto) => dto.mode === "receive")
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(PERSON_NAME)
  relativeName?: string;

  @ValidateIf((dto: CreateHairRegistrationDto) => dto.mode === "receive")
  @Transform(trim)
  @Matches(/^(?:[1-9]|1[0-2])\s*(?:tháng|thang)$/i)
  duration?: string;

  @ValidateIf((dto: CreateHairRegistrationDto) => dto.mode === "receive")
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(HAS_LETTER)
  hospital?: string;

  @ValidateIf((dto: CreateHairRegistrationDto) => dto.mode === "receive")
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(HAS_LETTER)
  diagnosis?: string;

  @ValidateIf((dto: CreateHairRegistrationDto) => dto.mode === "receive")
  @IsDateString({ strict: true })
  borrowDate?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  desiredLength?: string;

  @ValidateIf((dto: CreateHairRegistrationDto) => dto.mode === "receive")
  @Transform(trim)
  @IsString()
  @MinLength(10)
  transparency?: string;

  @ValidateIf((dto: CreateHairRegistrationDto) => dto.mode === "donate")
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(HAS_LETTER)
  donationLocation?: string;

  @ValidateIf((dto: CreateHairRegistrationDto) => dto.mode === "donate")
  @Transform(trim)
  @Matches(/^(?:2\d|[3-7]\d|80)(?:[.,]\d)?\s*cm$/i)
  donatedLength?: string;

  @ValidateIf((dto: CreateHairRegistrationDto) => dto.mode === "donate")
  @IsArray()
  @ArrayMinSize(5)
  @IsString({ each: true })
  acceptedCommitments?: string[];
}
