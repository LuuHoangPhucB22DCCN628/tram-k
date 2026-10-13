import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class SubmitPartnerApplicationDto {
  @ApiProperty({ example: "Nhóm thiện nguyện An Tâm" })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  organizationName!: string;

  @ApiProperty({ example: "Nguyễn An" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  representativeName!: string;

  @ApiProperty({ example: "0912345678" })
  @Matches(/^(0|\+84)[0-9]{9,10}$/)
  phone!: string;

  @ApiProperty({ example: "an@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(300)
  address!: string;

  @ApiProperty()
  @IsString()
  @MinLength(30)
  @MaxLength(2000)
  introduction!: string;

  @ApiProperty({ type: [String], description: "Khóa tệp riêng tư do dịch vụ lưu trữ trả về" })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  documentKeys!: string[];
}
