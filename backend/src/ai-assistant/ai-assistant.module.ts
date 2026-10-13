import { Module } from "@nestjs/common";

import { SearchModule } from "../search/search.module";
import { AuthModule } from "../auth/auth.module";
import { AiConversationService } from "./ai-conversation.service";
import { AiAssistantController } from "./ai-assistant.controller";
import { AiAssistantService } from "./ai-assistant.service";

@Module({
  imports: [AuthModule, SearchModule],
  controllers: [AiAssistantController],
  providers: [AiAssistantService, AiConversationService],
})
export class AiAssistantModule {}
