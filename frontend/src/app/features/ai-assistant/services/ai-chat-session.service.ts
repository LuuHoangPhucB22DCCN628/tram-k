import { computed, Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';

import type {
  AiChatMessage,
  AiConversationMessage,
  AiConversationSummary,
} from '../models/ai-assistant.models';
import { AiAssistantApiService } from './ai-assistant-api.service';

const MAX_MESSAGE_LENGTH = 1200;
const DISCLAIMER =
  'Trợ lý Trạm K chỉ cung cấp thông tin tham khảo, không thay thế chẩn đoán, điều trị hoặc tư vấn trực tiếp từ bác sĩ.';
const WELCOME_MESSAGE: AiChatMessage = {
  id: 1,
  role: 'assistant',
  content:
    'Chào bạn, tôi là Trợ lý Trạm K. Tôi có thể giúp bạn tìm hiểu cẩm nang, chăm sóc tinh thần và các chương trình hỗ trợ. Bạn đang cần điều gì hôm nay?',
  mode: 'LOCAL',
};

@Injectable({ providedIn: 'root' })
export class AiChatSessionService {
  private readonly api = inject(AiAssistantApiService);
  private readonly auth = inject(AuthService);
  private nextMessageId = 2;
  private initializedUserId: string | null | undefined;
  private initialization?: Promise<void>;

  readonly maxMessageLength = MAX_MESSAGE_LENGTH;
  readonly disclaimer = DISCLAIMER;
  readonly suggestions = [
    'Tôi vừa nhận chẩn đoán, nên chuẩn bị gì?',
    'Ăn uống thế nào trong thời gian hóa trị?',
    'Tôi đang rất lo lắng, làm sao để bình tĩnh hơn?',
    'Tìm chương trình hỗ trợ phù hợp với tôi',
  ] as const;
  readonly message = signal('');
  readonly loading = signal(false);
  readonly historyLoading = signal(false);
  readonly errorMessage = signal('');
  readonly messages = signal<readonly AiChatMessage[]>([WELCOME_MESSAGE]);
  readonly conversations = signal<readonly AiConversationSummary[]>([]);
  readonly activeConversationId = signal<string | null>(null);
  readonly persistenceEnabled = computed(() => this.auth.isAuthenticated());

  setMessage(value: string): void {
    this.message.set(value.slice(0, MAX_MESSAGE_LENGTH));
    this.errorMessage.set('');
  }

  async initialize(): Promise<void> {
    const userId = this.auth.currentUser()?.id ?? null;
    if (this.initializedUserId === userId) return this.initialization;
    if (this.initialization) await this.initialization;
    if (this.initializedUserId === userId) return;

    this.initialization = this.initializeFor(userId);
    await this.initialization;
    this.initialization = undefined;
  }

  async startNewConversation(): Promise<void> {
    await this.initialize();
    this.message.set('');
    this.errorMessage.set('');
    if (!this.auth.isAuthenticated()) {
      this.resetMessages();
      return;
    }

    this.historyLoading.set(true);
    try {
      const conversation = await firstValueFrom(this.api.createConversation());
      this.conversations.update((items) => [conversation, ...items]);
      this.activeConversationId.set(conversation.id);
      this.resetMessages();
    } catch {
      this.errorMessage.set('Chưa thể tạo cuộc trò chuyện mới. Bạn hãy thử lại.');
    } finally {
      this.historyLoading.set(false);
    }
  }

  async selectConversation(conversationId: string): Promise<void> {
    if (!this.auth.isAuthenticated() || conversationId === this.activeConversationId()) return;
    this.historyLoading.set(true);
    this.errorMessage.set('');
    try {
      const conversation = await firstValueFrom(this.api.getConversation(conversationId));
      this.activeConversationId.set(conversation.id);
      this.messages.set(conversation.messages.length ? conversation.messages : [WELCOME_MESSAGE]);
    } catch {
      this.errorMessage.set('Chưa thể tải cuộc trò chuyện này.');
    } finally {
      this.historyLoading.set(false);
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    if (!this.auth.isAuthenticated()) return;
    this.historyLoading.set(true);
    try {
      await firstValueFrom(this.api.deleteConversation(conversationId));
      const remaining = this.conversations().filter((item) => item.id !== conversationId);
      this.conversations.set(remaining);
      if (this.activeConversationId() === conversationId) {
        this.activeConversationId.set(null);
        this.resetMessages();
        if (remaining[0]) await this.selectConversation(remaining[0].id);
      }
    } catch {
      this.errorMessage.set('Chưa thể xóa cuộc trò chuyện. Bạn hãy thử lại.');
    } finally {
      this.historyLoading.set(false);
    }
  }

  async clearHistory(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      this.resetMessages();
      return;
    }
    this.historyLoading.set(true);
    try {
      await firstValueFrom(this.api.clearConversations());
      this.conversations.set([]);
      this.activeConversationId.set(null);
      this.resetMessages();
    } catch {
      this.errorMessage.set('Chưa thể xóa lịch sử. Bạn hãy thử lại.');
    } finally {
      this.historyLoading.set(false);
    }
  }

  async send(): Promise<boolean> {
    await this.initialize();
    const content = this.message().trim();
    if (this.loading()) return false;
    if (content.length < 2) {
      this.errorMessage.set('Vui lòng nhập ít nhất 2 ký tự.');
      return false;
    }

    const history: AiConversationMessage[] = this.messages()
      .slice(-8)
      .map(({ role, content: previousContent }) => ({ role, content: previousContent }));
    this.messages.update((items) => [
      ...items,
      { id: this.nextMessageId++, role: 'user', content },
    ]);
    this.message.set('');
    this.errorMessage.set('');
    this.loading.set(true);

    try {
      if (this.auth.isAuthenticated()) {
        let conversationId = this.activeConversationId();
        if (!conversationId) {
          const conversation = await firstValueFrom(this.api.createConversation());
          this.conversations.update((items) => [conversation, ...items]);
          this.activeConversationId.set(conversation.id);
          conversationId = conversation.id;
        }
        const result = await firstValueFrom(
          this.api.sendConversationMessage(conversationId, content),
        );
        this.messages.update((items) => [...items, result.assistantMessage]);
        this.updateConversation(result.conversation);
        return true;
      }

      const reply = await firstValueFrom(this.api.ask(content, history));
      this.messages.update((items) => [
        ...items,
        {
          id: this.nextMessageId++,
          role: 'assistant',
          content: reply.answer,
          sources: reply.sources,
          mode: reply.mode,
        },
      ]);
      return true;
    } catch {
      this.errorMessage.set(
        'Trợ lý chưa thể phản hồi lúc này. Bạn hãy thử lại hoặc xem các cẩm nang của Trạm K.',
      );
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  private async initializeFor(userId: string | null): Promise<void> {
    if (!userId) {
      if (this.initializedUserId) this.resetSessionState();
      this.initializedUserId = null;
      return;
    }

    this.historyLoading.set(true);
    try {
      const conversations = await firstValueFrom(this.api.listConversations());
      this.conversations.set(conversations);
      this.initializedUserId = userId;
      if (conversations[0]) await this.selectConversation(conversations[0].id);
      else this.resetMessages();
    } catch {
      this.initializedUserId = userId;
      this.errorMessage.set(
        'Chưa thể tải lịch sử. Bạn vẫn có thể bắt đầu một cuộc trò chuyện mới.',
      );
    } finally {
      this.historyLoading.set(false);
    }
  }

  private updateConversation(conversation: AiConversationSummary): void {
    this.conversations.update((items) => [
      conversation,
      ...items.filter((item) => item.id !== conversation.id),
    ]);
  }

  private resetSessionState(): void {
    this.conversations.set([]);
    this.activeConversationId.set(null);
    this.resetMessages();
  }

  private resetMessages(): void {
    this.nextMessageId = 2;
    this.message.set('');
    this.errorMessage.set('');
    this.messages.set([WELCOME_MESSAGE]);
  }
}
