import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';
import { HairRegistrationLookupApiService } from './hair-registration-lookup-api.service';

describe('HairRegistrationLookupApiService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000/' },
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('gets the current account registration by reference', async () => {
    const result = firstValueFrom(
      TestBed.inject(HairRegistrationLookupApiService).lookup('TK-20261017-ABCD1234'),
    );
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/community/hair-registrations/mine/TK-20261017-ABCD1234',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      data: {
        reference: 'TK-20261017-ABCD1234',
        mode: 'RECEIVE',
        status: 'PENDING',
        submittedAt: '2026-10-17T01:00:00.000Z',
        updatedAt: '2026-10-17T01:00:00.000Z',
        rejectionReason: null,
      },
    });
    await expect(result).resolves.toMatchObject({ status: 'PENDING' });
  });
});
