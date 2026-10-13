import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class RequestEmailChangeDto {
  @ApiProperty({ example: "email-moi@example.com" })
  @IsEmail()
  newEmail!: string;

  @ApiProperty({ minLength: 1 })
  @IsString()
  @MinLength(1)
  currentPassword!: string;
}
