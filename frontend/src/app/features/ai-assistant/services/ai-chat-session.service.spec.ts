import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';

import { AiAssistantApiService } from './ai-assistant-api.service';
import { AiChatSessionService } from './ai-chat-session.service';

describe('AiChatSessionService', () => {
  const summary = {
    id: 'conversation-1',
    title: 'Chuẩn bị hóa trị',
    createdAt: '2026-10-13T08:00:00.000Z',
    updatedAt: '2026-10-13T08:05:00.000Z',
    messageCount: 2,
  };
  const api = {
    ask: vi.fn(),
    listConversations: vi.fn(),
    createConversation: vi.fn(),
    getConversation: vi.fn(),
    sendConversationMessage: vi.fn(),
    deleteConversation: vi.fn(),
    clearConversations: vi.fn(),
  };
  const auth = {
    isAuthenticated: vi.fn(() => true),
    currentUser: vi.fn(() => ({ id: 'user-1' })),
  };

  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    auth.isAuthenticated.mockReturnValue(true);
    auth.currentUser.mockReturnValue({ id: 'user-1' });
    api.listConversations.mockReturnValue(of([summary]));
    api.getConversation.mockReturnValue(
      of({
        ...summary,
        messages: [
          {
            id: 'message-1',
            role: 'user',
            content: 'Tôi cần chuẩn bị gì?',
            createdAt: '2026-10-13T08:00:00.000Z',
          },
          {
            id: 'message-2',
            role: 'assistant',
            content: 'Hãy xác nhận lịch với cơ sở điều trị.',
            mode: 'LOCAL',
            createdAt: '2026-10-13T08:00:02.000Z',
          },
        ],
      }),
    );
    api.sendConversationMessage.mockReturnValue(
      of({
        conversation: { ...summary, messageCount: 4 },
        userMessage: { id: 'message-3', role: 'user', content: 'Tôi cần mang gì?' },
        assistantMessage: {
          id: 'message-4',
          role: 'assistant',
          content: 'Bạn nên mang giấy tờ khám bệnh.',
          mode: 'LOCAL',
          sources: [],
        },
        disclaimer: 'Không thay thế bác sĩ.',
        suggestedQuestions: [],
      }),
    );

    TestBed.configureTestingModule({
      providers: [
        AiChatSessionService,
        { provide: AiAssistantApiService, useValue: api },
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  it('loads the most recent conversation for an authenticated user', async () => {
    const service = TestBed.inject(AiChatSessionService);

    await service.initialize();

    expect(api.listConversations).toHaveBeenCalledOnce();
    expect(api.getConversation).toHaveBeenCalledWith('conversation-1');
    expect(service.activeConversationId()).toBe('conversation-1');
    expect(service.messages()).toHaveLength(2);
  });

  it('persists new messages in the active authenticated conversation', async () => {
    const service = TestBed.inject(AiChatSessionService);
    await service.initialize();
    service.setMessage('Tôi cần mang gì?');

    await expect(service.send()).resolves.toBe(true);

    expect(api.sendConversationMessage).toHaveBeenCalledWith('conversation-1', 'Tôi cần mang gì?');
    expect(api.ask).not.toHaveBeenCalled();
    expect(service.messages().at(-1)?.content).toContain('giấy tờ khám bệnh');
  });
});
