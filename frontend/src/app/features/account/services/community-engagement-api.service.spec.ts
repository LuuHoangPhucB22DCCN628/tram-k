import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';
import { CommunityEngagementApiService } from './community-engagement-api.service';

describe('CommunityEngagementApiService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
      ],
    });
  });

  it('identifies a lost backend connection when a comment cannot be posted', async () => {
    const service = TestBed.inject(CommunityEngagementApiService);
    const http = TestBed.inject(HttpTestingController);
    const result = firstValueFrom(service.createComment('story-1', {
      content: 'alo', sourceTitle: 'Câu chuyện', sourcePath: '/goc-tam-ly?story=story-1',
    }));
    http.expectOne('http://localhost:3000/community/stories/story-1/comments')
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(await result).toBeNull();
    expect(service.lastCommentError()).toContain('Không kết nối được máy chủ');
    http.verify();
  });

  it('sends only fields accepted by the backend when the UI also supplies an author name', async () => {
    const service = TestBed.inject(CommunityEngagementApiService);
    const http = TestBed.inject(HttpTestingController);
    const input = {
      authorName: 'Mai', content: 'alo', sourceTitle: 'Câu chuyện',
      sourcePath: '/goc-tam-ly?story=story-1',
    };
    const result = firstValueFrom(service.createComment('story-1', input));
    const request = http.expectOne('http://localhost:3000/community/stories/story-1/comments');
    expect(Object.keys(request.request.body).sort()).toEqual([
      'content', 'idempotencyKey', 'sourcePath', 'sourceTitle',
    ]);
    request.flush({ success: true, data: {
      id: 'comment-1', userId: 'member-1', content: 'alo', sourceTitle: 'Câu chuyện',
      sourcePath: '/goc-tam-ly?story=story-1', parentId: null, deletedAt: null,
      createdAt: '2026-10-25T00:00:00.000Z', updatedAt: '2026-10-25T00:00:00.000Z',
    } });

    expect((await result)?.content).toBe('alo');
    http.verify();
  });
});
