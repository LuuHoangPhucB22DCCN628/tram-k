import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewMemberPostDto {
  @ApiProperty({ enum: ["PUBLISHED", "REJECTED"] })
  @IsIn(["PUBLISHED", "REJECTED"])
  decision!: "PUBLISHED" | "REJECTED";

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
