import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "member@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: ["PUBLIC", "ADMIN"], default: "PUBLIC" })
  @IsIn(["PUBLIC", "ADMIN"])
  portal: "PUBLIC" | "ADMIN" = "PUBLIC";
}
