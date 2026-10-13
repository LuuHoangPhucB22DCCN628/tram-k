import { ApiProperty } from "@nestjs/swagger";
import { Matches } from "class-validator";

export class CommunitySourceKeyParamDto {
  @ApiProperty({ example: "sample-1" })
  @Matches(/^[A-Za-z0-9_-]{2,120}$/)
  sourceKey!: string;
}
