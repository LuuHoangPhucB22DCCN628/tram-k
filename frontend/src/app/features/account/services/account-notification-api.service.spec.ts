import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import { AccountNotificationApiService } from './account-notification-api.service';

describe('AccountNotificationApiService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads and maps notifications owned by the current remote account', async () => {
    const resultPromise = firstValueFrom(TestBed.inject(AccountNotificationApiService).list());
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/notifications?limit=50',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      data: {
        items: [
          {
            id: 'notification-1',
            recipientId: 'user-1',
            kind: 'PARTNER_APPLICATION_APPROVED',
            title: 'Hồ sơ đã được duyệt',
            message: 'Bạn đã trở thành đối tác.',
            link: '/doi-tac/ho-so',
            readAt: null,
            createdAt: '2026-10-09T08:00:00.000Z',
          },
        ],
        unreadCount: 1,
        nextCursor: null,
      },
    });

    await expect(resultPromise).resolves.toEqual(
      expect.objectContaining({
        unreadCount: 1,
        items: [expect.objectContaining({ recipientUserId: 'user-1', readAt: undefined })],
      }),
    );
  });

  it('marks one or all backend notifications as read', async () => {
    const service = TestBed.inject(AccountNotificationApiService);
    const onePromise = firstValueFrom(service.markRead('notification-1'));
    const oneRequest = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/notifications/notification-1/read',
    );
    expect(oneRequest.request.method).toBe('PATCH');
    oneRequest.flush({ success: true, data: { updated: true } });
    await expect(onePromise).resolves.toBe(true);

    const allPromise = firstValueFrom(service.markAllRead());
    const allRequest = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/notifications/read-all',
    );
    allRequest.flush({ success: true, data: { updatedCount: 3 } });
    await expect(allPromise).resolves.toBe(3);
  });
});
