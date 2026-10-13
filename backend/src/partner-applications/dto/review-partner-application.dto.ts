import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";

export class ReviewPartnerApplicationDto {
  @ApiProperty({ enum: ["APPROVED", "REJECTED"] })
  @IsIn(["APPROVED", "REJECTED"])
  decision!: "APPROVED" | "REJECTED";

  @ApiProperty({ required: false, description: "Bắt buộc khi từ chối" })
  @ValidateIf((value: ReviewPartnerApplicationDto) => value.decision === "REJECTED")
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason?: string;
}
