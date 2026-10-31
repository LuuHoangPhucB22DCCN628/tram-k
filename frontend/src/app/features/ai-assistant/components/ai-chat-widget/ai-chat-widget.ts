import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AiChatSessionService } from '../../services/ai-chat-session.service';

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ai-chat-widget.html',
  styleUrl: './ai-chat-widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiChatWidget {
  protected readonly chat = inject(AiChatSessionService);
  protected readonly isOpen = signal(false);

  @ViewChild('widgetInput') private widgetInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('widgetConversation') private widgetConversation?: ElementRef<HTMLElement>;

  protected async open(): Promise<void> {
    this.isOpen.set(true);
    await this.chat.initialize();
    this.focusInput();
    this.scrollToLatest();
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected async startNewConversation(): Promise<void> {
    await this.chat.startNewConversation();
    this.scrollToLatest();
    this.focusInput();
  }

  protected useSuggestion(question: string): void {
    if (this.chat.loading()) return;
    this.chat.setMessage(question);
    this.focusInput();
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

  protected isInternalLink(link: string): boolean {
    return link.startsWith('/') && !link.startsWith('//');
  }

  @HostListener('document:keydown.escape')
  protected closeWithEscape(): void {
    if (this.isOpen()) this.close();
  }

  private focusInput(): void {
    queueMicrotask(() => this.widgetInput?.nativeElement.focus());
  }

  private scrollToLatest(): void {
    queueMicrotask(() => {
      const element = this.widgetConversation?.nativeElement;
      if (!element) return;
      if (typeof element.scrollTo === 'function') {
        element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
      } else {
        element.scrollTop = element.scrollHeight;
      }
    });
  }
}
