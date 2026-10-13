import { IsString, Length } from "class-validator";

export class SendAiConversationMessageDto {
  @IsString()
  @Length(2, 1200)
  message!: string;
}
