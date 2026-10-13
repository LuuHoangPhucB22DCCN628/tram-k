import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import type {
  AiAssistantReply,
  AiConversationDetail,
  AiConversationMessage,
  AiConversationSendResult,
  AiConversationSummary,
} from '../models/ai-assistant.models';

interface ApiSuccessResponse<T> {
  readonly success: true;
  readonly data: T;
}

@Injectable({ providedIn: 'root' })
export class AiAssistantApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL).replace(/\/$/, '');

  ask(message: string, history: readonly AiConversationMessage[]): Observable<AiAssistantReply> {
    return this.http
      .post<ApiSuccessResponse<AiAssistantReply>>(`${this.apiBaseUrl}/ai/assistant`, {
        message,
        history: history.slice(-8),
      })
      .pipe(map(({ data }) => data));
  }

  listConversations(): Observable<readonly AiConversationSummary[]> {
    return this.http
      .get<ApiSuccessResponse<readonly AiConversationSummary[]>>(
        `${this.apiBaseUrl}/ai/assistant/conversations`,
      )
      .pipe(map(({ data }) => data));
  }

  createConversation(): Observable<AiConversationSummary> {
    return this.http
      .post<ApiSuccessResponse<AiConversationSummary>>(
        `${this.apiBaseUrl}/ai/assistant/conversations`,
        {},
      )
      .pipe(map(({ data }) => data));
  }

  getConversation(conversationId: string): Observable<AiConversationDetail> {
    return this.http
      .get<ApiSuccessResponse<AiConversationDetail>>(
        `${this.apiBaseUrl}/ai/assistant/conversations/${encodeURIComponent(conversationId)}`,
      )
      .pipe(map(({ data }) => data));
  }

  sendConversationMessage(
    conversationId: string,
    message: string,
  ): Observable<AiConversationSendResult> {
    return this.http
      .post<ApiSuccessResponse<AiConversationSendResult>>(
        `${this.apiBaseUrl}/ai/assistant/conversations/${encodeURIComponent(conversationId)}/messages`,
        { message },
      )
      .pipe(map(({ data }) => data));
  }

  deleteConversation(conversationId: string): Observable<boolean> {
    return this.http
      .delete<ApiSuccessResponse<{ deleted: boolean }>>(
        `${this.apiBaseUrl}/ai/assistant/conversations/${encodeURIComponent(conversationId)}`,
      )
      .pipe(map(({ data }) => data.deleted));
  }

  clearConversations(): Observable<number> {
    return this.http
      .delete<ApiSuccessResponse<{ deletedCount: number }>>(
        `${this.apiBaseUrl}/ai/assistant/conversations`,
      )
      .pipe(map(({ data }) => data.deletedCount));
  }
}
