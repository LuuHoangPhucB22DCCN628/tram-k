import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { RevealDirective } from '@shared/directives/reveal.directive';

import { AiChatSessionService } from '../../services/ai-chat-session.service';

@Component({
  selector: 'app-ai-assistant-page',
  standalone: true,
  imports: [RouterLink, RevealDirective],
  templateUrl: './ai-assistant-page.html',
  styleUrl: './ai-assistant-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAssistantPage {
  private readonly chat = inject(AiChatSessionService);

  @ViewChild('messageInput') private messageInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('conversation') private conversation?: ElementRef<HTMLElement>;

  protected readonly maxMessageLength = this.chat.maxMessageLength;
  protected readonly message = this.chat.message;
  protected readonly loading = this.chat.loading;
  protected readonly errorMessage = this.chat.errorMessage;
  protected readonly messages = this.chat.messages;
  protected readonly suggestions = this.chat.suggestions;
  protected readonly disclaimer = this.chat.disclaimer;
  protected readonly conversations = this.chat.conversations;
  protected readonly activeConversationId = this.chat.activeConversationId;
  protected readonly historyLoading = this.chat.historyLoading;
  protected readonly persistenceEnabled = this.chat.persistenceEnabled;
  protected readonly confirmClearHistory = signal(false);

  constructor() {
    void this.chat.initialize();
  }

  protected useSuggestion(question: string): void {
    if (this.loading()) return;
    this.chat.setMessage(question);
    this.focusInput();
  }

  protected onInput(value: string): void {
    this.chat.setMessage(value);
  }

  protected onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    void this.send();
  }

  protected async send(): Promise<void> {
    this.scrollToLatest();
    await this.chat.send();
    this.scrollToLatest();
    this.focusInput();
  }

  protected async startNewConversation(): Promise<void> {
    this.confirmClearHistory.set(false);
    await this.chat.startNewConversation();
    this.scrollToLatest();
    this.focusInput();
  }

  protected async selectConversation(conversationId: string): Promise<void> {
    this.confirmClearHistory.set(false);
    await this.chat.selectConversation(conversationId);
    this.scrollToLatest();
  }

  protected requestClearHistory(): void {
    this.confirmClearHistory.set(true);
  }

  protected cancelClearHistory(): void {
    this.confirmClearHistory.set(false);
  }

  protected async clearHistory(): Promise<void> {
    await this.chat.clearHistory();
    this.confirmClearHistory.set(false);
    this.scrollToLatest();
  }

  protected isInternalLink(link: string): boolean {
    return link.startsWith('/');
  }

  private focusInput(): void {
    queueMicrotask(() => this.messageInput?.nativeElement.focus());
  }

  private scrollToLatest(): void {
    queueMicrotask(() => {
      const element = this.conversation?.nativeElement;
      if (!element) return;
      if (typeof element.scrollTo === 'function') {
        element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
      } else {
        element.scrollTop = element.scrollHeight;
      }
    });
  }
}
