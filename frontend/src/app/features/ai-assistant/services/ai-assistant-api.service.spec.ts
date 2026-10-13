import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import { AiAssistantApiService } from './ai-assistant-api.service';

describe('AiAssistantApiService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AiAssistantApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads the authenticated user conversation list', () => {
    const service = TestBed.inject(AiAssistantApiService);
    const http = TestBed.inject(HttpTestingController);
    let result: unknown;

    service.listConversations().subscribe((value) => (result = value));
    const request = http.expectOne('http://localhost:3000/ai/assistant/conversations');
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      data: [
        {
          id: 'conversation-1',
          title: 'Chuẩn bị hóa trị',
          createdAt: '2026-10-13T08:00:00.000Z',
          updatedAt: '2026-10-13T08:05:00.000Z',
          messageCount: 2,
        },
      ],
    });

    expect(result).toEqual([expect.objectContaining({ id: 'conversation-1' })]);
  });

  it('sends a message through the selected persistent conversation', () => {
    const service = TestBed.inject(AiAssistantApiService);
    const http = TestBed.inject(HttpTestingController);

    service.sendConversationMessage('conversation/1', 'Tôi cần chuẩn bị gì?').subscribe();
    const request = http.expectOne(
      'http://localhost:3000/ai/assistant/conversations/conversation%2F1/messages',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ message: 'Tôi cần chuẩn bị gì?' });
    request.flush({ success: true, data: {} });
  });
});
