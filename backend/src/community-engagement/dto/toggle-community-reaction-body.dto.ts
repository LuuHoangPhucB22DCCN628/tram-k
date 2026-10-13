import { ApiProperty } from "@nestjs/swagger";
import { CommunityReactionType } from "@prisma/client";
import { IsEnum } from "class-validator";

export class ToggleCommunityReactionBodyDto {
  @ApiProperty({ enum: CommunityReactionType })
  @IsEnum(CommunityReactionType)
  type!: CommunityReactionType;
}
