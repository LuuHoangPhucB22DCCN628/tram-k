import { Injectable, NotFoundException } from "@nestjs/common";
import { AiConversationMessageRole, Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { AiAssistantService } from "./ai-assistant.service";
import { AiAssistantMode, AiAssistantSource } from "./ai-assistant.types";

const NEW_CONVERSATION_TITLE = "Cuộc trò chuyện mới";

@Injectable()
export class AiConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assistant: AiAssistantService,
  ) {}

  async list(userId: string) {
    const conversations = await this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }],
      take: 20,
      include: { _count: { select: { messages: true } } },
    });
    return conversations.map((conversation) => this.summary(conversation));
  }

  async create(userId: string) {
    const conversation = await this.prisma.aiConversation.create({
      data: { userId, title: NEW_CONVERSATION_TITLE },
      include: { _count: { select: { messages: true } } },
    });
    return this.summary(conversation);
  }

  async get(userId: string, conversationId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: { orderBy: [{ createdAt: "asc" }] },
        _count: { select: { messages: true } },
      },
    });
    if (!conversation)
      throw new NotFoundException("Không tìm thấy cuộc trò chuyện.");

    return {
      ...this.summary(conversation),
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role:
          message.role === AiConversationMessageRole.USER
            ? "user"
            : "assistant",
        content: message.content,
        mode: message.mode as AiAssistantMode | null,
        sources: this.sources(message.sources),
        createdAt: message.createdAt.toISOString(),
      })),
    };
  }

  async send(userId: string, conversationId: string, message: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
      include: { _count: { select: { messages: true } } },
    });
    if (!conversation)
      throw new NotFoundException("Không tìm thấy cuộc trò chuyện.");

    const previousMessages = await this.prisma.aiConversationMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }],
      take: 8,
    });
    const reply = await this.assistant.ask({
      message,
      history: previousMessages.reverse().map((item) => ({
        role:
          item.role === AiConversationMessageRole.USER ? "user" : "assistant",
        content: item.content,
      })),
    });
    const now = new Date();
    const title =
      conversation._count.messages === 0
        ? this.titleFrom(message)
        : conversation.title;

    const saved = await this.prisma.$transaction(async (transaction) => {
      const userMessage = await transaction.aiConversationMessage.create({
        data: {
          conversationId,
          role: AiConversationMessageRole.USER,
          content: message.trim(),
        },
      });
      const assistantMessage = await transaction.aiConversationMessage.create({
        data: {
          conversationId,
          role: AiConversationMessageRole.ASSISTANT,
          content: reply.answer,
          mode: reply.mode,
          sources: reply.sources as unknown as Prisma.InputJsonValue,
        },
      });
      await transaction.aiConversation.update({
        where: { id: conversationId },
        data: { title, updatedAt: now },
      });
      return { userMessage, assistantMessage };
    });

    return {
      conversation: {
        id: conversation.id,
        title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: now.toISOString(),
        messageCount: conversation._count.messages + 2,
      },
      userMessage: {
        id: saved.userMessage.id,
        role: "user" as const,
        content: saved.userMessage.content,
        createdAt: saved.userMessage.createdAt.toISOString(),
      },
      assistantMessage: {
        id: saved.assistantMessage.id,
        role: "assistant" as const,
        content: reply.answer,
        mode: reply.mode,
        sources: reply.sources,
        createdAt: saved.assistantMessage.createdAt.toISOString(),
      },
      disclaimer: reply.disclaimer,
      suggestedQuestions: reply.suggestedQuestions,
    };
  }

  async remove(userId: string, conversationId: string) {
    const result = await this.prisma.aiConversation.deleteMany({
      where: { id: conversationId, userId },
    });
    if (!result.count)
      throw new NotFoundException("Không tìm thấy cuộc trò chuyện.");
    return { deleted: true };
  }

  async clear(userId: string) {
    const result = await this.prisma.aiConversation.deleteMany({
      where: { userId },
    });
    return { deletedCount: result.count };
  }

  private summary(conversation: {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    _count: { messages: number };
  }) {
    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messageCount: conversation._count.messages,
    };
  }

  private titleFrom(message: string): string {
    const compact = message.trim().replace(/\s+/g, " ");
    return compact.length <= 72
      ? compact
      : `${compact.slice(0, 69).trimEnd()}…`;
  }

  private sources(
    value: Prisma.JsonValue | null,
  ): readonly AiAssistantSource[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is { title: string; link: string; type: string } =>
        Boolean(
          item &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          typeof item.title === "string" &&
          typeof item.link === "string" &&
          typeof item.type === "string",
        ),
    );
  }
}
