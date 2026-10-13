import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import { SiteSearchApiService } from './site-search-api.service';

describe('SiteSearchApiService', () => {
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

  it('loads public search results with the backend page size', async () => {
    const resultPromise = firstValueFrom(TestBed.inject(SiteSearchApiService).search(' ung thư '));
    const request = TestBed.inject(HttpTestingController).expectOne(
      (candidate) =>
        candidate.url === 'http://localhost:3000/search' &&
        candidate.params.get('q') === 'ung thư' &&
        candidate.params.get('page') === '1' &&
        candidate.params.get('pageSize') === '100',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      data: {
        items: [
          {
            id: 'GUIDE-1',
            type: 'GUIDE',
            title: 'Dinh dưỡng cho bệnh nhân ung thư',
            description: 'Gợi ý bữa ăn dễ áp dụng.',
            eyebrow: 'Cẩm nang',
            metadata: 'Dinh dưỡng',
            link: '/cam-nang/dinh-duong',
            publishedAt: '2026-10-01T00:00:00.000Z',
            score: 60,
          },
        ],
        page: 1,
        pageSize: 100,
        totalItems: 1,
        totalPages: 1,
      },
    });

    await expect(resultPromise).resolves.toEqual([
      expect.objectContaining({ id: 'GUIDE-1', type: 'GUIDE' }),
    ]);
  });

  it('returns null so local data can be used when the API is unavailable', async () => {
    const resultPromise = firstValueFrom(TestBed.inject(SiteSearchApiService).search('ung thư'));
    const request = TestBed.inject(HttpTestingController).expectOne(
      (candidate) => candidate.url === 'http://localhost:3000/search',
    );
    request.flush('Unavailable', { status: 503, statusText: 'Unavailable' });

    await expect(resultPromise).resolves.toBeNull();
  });
});
