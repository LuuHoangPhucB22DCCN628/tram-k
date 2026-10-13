import { ApiProperty } from "@nestjs/swagger";
import { CommunityReactionType } from "@prisma/client";
import { IsEnum, IsString, MaxLength, MinLength } from "class-validator";

export class ToggleCommunityReactionDto {
  @ApiProperty({ example: "story-hope-01" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  sourceKey!: string;

  @ApiProperty({ enum: CommunityReactionType })
  @IsEnum(CommunityReactionType)
  type!: CommunityReactionType;
}
