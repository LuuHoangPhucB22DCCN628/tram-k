import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from "class-validator";

export class AiConversationMessageDto {
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @IsString()
  @Length(1, 1200)
  content!: string;
}

export class AskAiAssistantDto {
  @IsString()
  @Length(2, 1200)
  message!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => AiConversationMessageDto)
  history: AiConversationMessageDto[] = [];
}
