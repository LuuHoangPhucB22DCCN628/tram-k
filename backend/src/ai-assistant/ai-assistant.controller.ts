import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { AiConversationService } from "./ai-conversation.service";
import { AiAssistantService } from "./ai-assistant.service";
import { AiAssistantReply } from "./ai-assistant.types";
import { AskAiAssistantDto } from "./dto/ask-ai-assistant.dto";
import { SendAiConversationMessageDto } from "./dto/send-ai-conversation-message.dto";

interface RateWindow {
  count: number;
  resetAt: number;
}

@ApiTags("ai-assistant")
@Controller("ai/assistant")
export class AiAssistantController {
  private readonly windows = new Map<string, RateWindow>();

  constructor(
    private readonly assistant: AiAssistantService,
    private readonly conversations: AiConversationService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async ask(
    @Req() request: Request,
    @Body() input: AskAiAssistantDto,
  ): Promise<ApiSuccessResponse<AiAssistantReply>> {
    this.consume(request.ip || request.socket.remoteAddress || "unknown");
    return { success: true, data: await this.assistant.ask(input) };
  }

  @Get("conversations")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async listConversations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.conversations.list(user.id) };
  }

  @Post("conversations")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createConversation(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.conversations.create(user.id) };
  }

  @Get("conversations/:conversationId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.conversations.get(user.id, conversationId),
    };
  }

  @Post("conversations/:conversationId/messages")
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async sendConversationMessage(
    @Req() request: Request,
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() input: SendAiConversationMessageDto,
  ): Promise<ApiSuccessResponse<unknown>> {
    this.consume(
      `${user.id}:${request.ip || request.socket.remoteAddress || "unknown"}`,
    );
    return {
      success: true,
      data: await this.conversations.send(
        user.id,
        conversationId,
        input.message.trim(),
      ),
    };
  }

  @Delete("conversations/:conversationId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async deleteConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
  ): Promise<ApiSuccessResponse<unknown>> {
    return {
      success: true,
      data: await this.conversations.remove(user.id, conversationId),
    };
  }

  @Delete("conversations")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async clearConversations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.conversations.clear(user.id) };
  }

  private consume(identity: string): void {
    const now = Date.now();
    const limit = this.config.get<number>("AI_RATE_LIMIT_PER_MINUTE") ?? 12;
    const current = this.windows.get(identity);
    if (!current || current.resetAt <= now) {
      this.windows.set(identity, { count: 1, resetAt: now + 60_000 });
      this.prune(now);
      return;
    }
    if (current.count >= limit) {
      throw new HttpException(
        "Bạn gửi câu hỏi quá nhanh. Vui lòng thử lại sau ít phút.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    current.count += 1;
  }

  private prune(now: number): void {
    if (this.windows.size < 500) return;
    for (const [key, value] of this.windows) {
      if (value.resetAt <= now) this.windows.delete(key);
    }
  }
}
