import { ApiProperty } from "@nestjs/swagger";
import { RoleName } from "@prisma/client";
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "Nguyễn Minh An" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;

  @ApiProperty({ example: "member@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 15 })
  @IsString()
  @MinLength(15)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: "Mật khẩu phải có chữ hoa, chữ thường và chữ số.",
  })
  password!: string;

  @ApiProperty({ enum: [RoleName.PATIENT, RoleName.CARER] })
  @IsEnum(RoleName)
  role!: Extract<RoleName, "PATIENT" | "CARER">;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  acceptedTerms!: true;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  acceptedPrivacy!: true;
}
