import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import type { ContentPage, ContentSummary } from '../models/content.models';
import { ContentApiError } from '../models/content.models';
import { ContentPublicApiService } from './content-public-api.service';

describe('ContentPublicApiService', () => {
  let service: ContentPublicApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test/' },
      ],
    });
    service = TestBed.inject(ContentPublicApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the paginated list and unwraps the success envelope', async () => {
    const response: ContentPage<ContentSummary> = {
      items: [],
      page: 2,
      pageSize: 12,
      totalItems: 23,
      totalPages: 2,
    };
    const result = firstValueFrom(
      service.list({ kind: 'GUIDE', search: 'hoa tri', page: 2, pageSize: 12 }),
    );

    const request = http.expectOne(
      (candidate) =>
        candidate.url === 'https://api.example.test/public/contents' &&
        candidate.params.get('kind') === 'GUIDE' &&
        candidate.params.get('search') === 'hoa tri' &&
        candidate.params.get('page') === '2' &&
        candidate.params.get('pageSize') === '12',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, data: response });

    await expect(result).resolves.toEqual(response);
  });

  it('maps a missing public detail to the content not found error', async () => {
    const result = firstValueFrom(service.getBySlug('GUIDE', 'missing'));
    const request = http.expectOne('https://api.example.test/public/contents/GUIDE/missing');
    request.flush(
      {
        success: false,
        error: { code: 'HTTP_404', message: 'Not found' },
      },
      { status: 404, statusText: 'Not Found' },
    );

    await expect(result).rejects.toEqual(
      expect.objectContaining<Partial<ContentApiError>>({
        code: 'CONTENT_NOT_FOUND',
      }),
    );
  });
});
