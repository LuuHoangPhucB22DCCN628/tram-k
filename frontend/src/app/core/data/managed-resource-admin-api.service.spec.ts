import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url.token';
import { ManagedResourceAdminApiService } from './managed-resource-admin-api.service';

describe('ManagedResourceAdminApiService', () => {
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

  it('loads a bounded admin resource page and unwraps the state', async () => {
    const service = TestBed.inject(ManagedResourceAdminApiService);
    const result = firstValueFrom(service.state('GUIDE'));
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/managed-resources/admin-state?page=1&limit=100&type=GUIDE',
    );
    const state = {
      initialized: true,
      items: [{ sourceId: 'GUIDE-1', type: 'GUIDE', status: 'PUBLISHED', payload: {} }],
      total: 1,
      page: 1,
      limit: 100,
    };
    request.flush({ success: true, data: state });

    await expect(result).resolves.toEqual(state);
  });
});
