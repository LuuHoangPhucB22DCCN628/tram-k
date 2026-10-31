import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateMemberPostDto {
  @ApiProperty({ minLength: 5, maxLength: 120 })
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ minLength: 20, maxLength: 5000 })
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  content!: string;

  @ApiProperty({ enum: ["DRAFT", "PENDING"] })
  @IsIn(["DRAFT", "PENDING"])
  status!: "DRAFT" | "PENDING";

  @ApiPropertyOptional({ description: "ID cũ để chuyển một lần từ lưu trữ trình duyệt" })
  @IsOptional()
  @IsString()
  @Matches(/^POST-\d{10,}-[a-z0-9]{6,}$/)
  legacyId?: string;
}
