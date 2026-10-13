import { NotFoundException } from "@nestjs/common";
import { AiConversationMessageRole } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { AiConversationService } from "./ai-conversation.service";
import { AiAssistantService } from "./ai-assistant.service";

describe("AiConversationService", () => {
  const aiConversation = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  };
  const aiConversationMessage = {
    findMany: jest.fn(),
    create: jest.fn(),
  };
  const transaction = jest.fn();
  const prisma = {
    aiConversation,
    aiConversationMessage,
    $transaction: transaction,
  } as unknown as PrismaService;
  const assistant = { ask: jest.fn() } as unknown as AiAssistantService;
  const service = new AiConversationService(prisma, assistant);

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.mockImplementation((callback) =>
      callback({ aiConversation, aiConversationMessage }),
    );
  });

  it("lists only conversations owned by the authenticated user", async () => {
    aiConversation.findMany.mockResolvedValue([
      {
        id: "conversation-1",
        title: "Chuẩn bị hóa trị",
        createdAt: new Date("2026-10-13T08:00:00.000Z"),
        updatedAt: new Date("2026-10-13T08:05:00.000Z"),
        _count: { messages: 2 },
      },
    ]);

    await expect(service.list("user-1")).resolves.toEqual([
      expect.objectContaining({ id: "conversation-1", messageCount: 2 }),
    ]);
    expect(aiConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, take: 20 }),
    );
  });

  it("does not expose a conversation owned by another user", async () => {
    aiConversation.findFirst.mockResolvedValue(null);

    await expect(
      service.get("user-1", "conversation-2"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(aiConversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conversation-2", userId: "user-1" },
      }),
    );
  });

  it("sends the stored history to the assistant and persists both messages", async () => {
    const createdAt = new Date("2026-10-13T08:10:00.000Z");
    aiConversation.findFirst.mockResolvedValue({
      id: "conversation-1",
      title: "Cuộc trò chuyện mới",
      createdAt,
      updatedAt: createdAt,
      _count: { messages: 0 },
    });
    aiConversationMessage.findMany.mockResolvedValue([
      {
        role: AiConversationMessageRole.ASSISTANT,
        content: "Bạn cần hỗ trợ điều gì?",
      },
    ]);
    (assistant.ask as jest.Mock).mockResolvedValue({
      answer: "Bạn hãy xác nhận lịch với cơ sở điều trị.",
      mode: "LOCAL",
      disclaimer: "Không thay thế bác sĩ.",
      sources: [{ title: "Cẩm nang", link: "/cam-nang", type: "GUIDE" }],
      suggestedQuestions: [],
    });
    aiConversationMessage.create
      .mockResolvedValueOnce({
        id: "message-user",
        content: "Tôi cần chuẩn bị gì?",
        createdAt,
      })
      .mockResolvedValueOnce({ id: "message-ai", createdAt });
    aiConversation.update.mockResolvedValue({ id: "conversation-1" });

    const result = await service.send(
      "user-1",
      "conversation-1",
      "Tôi cần chuẩn bị gì?",
    );

    expect(assistant.ask).toHaveBeenCalledWith({
      message: "Tôi cần chuẩn bị gì?",
      history: [{ role: "assistant", content: "Bạn cần hỗ trợ điều gì?" }],
    });
    expect(aiConversationMessage.create).toHaveBeenCalledTimes(2);
    expect(result.conversation.title).toBe("Tôi cần chuẩn bị gì?");
    expect(result.assistantMessage.content).toContain("xác nhận lịch");
  });

  it("deletes only the requested conversation owned by the user", async () => {
    aiConversation.deleteMany.mockResolvedValue({ count: 1 });

    await expect(service.remove("user-1", "conversation-1")).resolves.toEqual({
      deleted: true,
    });
    expect(aiConversation.deleteMany).toHaveBeenCalledWith({
      where: { id: "conversation-1", userId: "user-1" },
    });
  });
});
