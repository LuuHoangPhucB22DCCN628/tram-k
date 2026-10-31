import { IsBoolean, IsOptional } from "class-validator";

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  storyComments?: boolean;

  @IsOptional()
  @IsBoolean()
  storyReplies?: boolean;

  @IsOptional()
  @IsBoolean()
  storyReactions?: boolean;
}
