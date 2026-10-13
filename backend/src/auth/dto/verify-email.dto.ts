import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class VerifyEmailDto {
  @ApiProperty({ description: "Mã xác minh một lần nhận qua email" })
  @IsString()
  @MinLength(32)
  @MaxLength(200)
  token!: string;
}
