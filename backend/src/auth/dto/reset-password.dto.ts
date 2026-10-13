import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ description: "Mã đặt lại mật khẩu dùng một lần" })
  @IsString()
  @MinLength(32)
  @MaxLength(200)
  token!: string;

  @ApiProperty({ minLength: 15, maxLength: 128 })
  @IsString()
  @MinLength(15)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: "Mật khẩu phải có chữ hoa, chữ thường và chữ số.",
  })
  password!: string;
}
