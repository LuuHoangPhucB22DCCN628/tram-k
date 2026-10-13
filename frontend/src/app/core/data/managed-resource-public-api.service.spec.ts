import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import { ManagedResourcePublicApiService } from './managed-resource-public-api.service';

describe('ManagedResourcePublicApiService', () => {
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

  it('returns only payloads that match the requested public resource type', async () => {
    const service = TestBed.inject(ManagedResourcePublicApiService);
    const resultPromise = firstValueFrom(
      service.state<{ id: string }>('STORY', (payload): payload is { id: string } =>
        Boolean(payload && typeof payload === 'object' && 'id' in payload),
      ),
    );
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/managed-resources/public-state?type=STORY',
    );
    request.flush({
      success: true,
      data: {
        initialized: true,
        items: [
          { sourceId: 'STORY-1', type: 'STORY', payload: { id: 'STORY-1' } },
          { sourceId: 'STORY-INVALID', type: 'STORY', payload: null },
        ],
      },
    });

    await expect(resultPromise).resolves.toEqual({
      initialized: true,
      items: [{ id: 'STORY-1' }],
    });
  });

  it('returns null so callers can keep Figma fallback data when the API is unavailable', async () => {
    const service = TestBed.inject(ManagedResourcePublicApiService);
    const resultPromise = firstValueFrom(
      service.state<unknown>('PODCAST', (payload): payload is unknown => payload !== undefined),
    );
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:3000/managed-resources/public-state?type=PODCAST')
      .error(new ProgressEvent('network error'));

    await expect(resultPromise).resolves.toBeNull();
  });
});
