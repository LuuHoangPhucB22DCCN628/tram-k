import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import { PartnerApplicationApiService } from './partner-application-api.service';

describe('PartnerApplicationApiService', () => {
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

  it('requests a bounded admin page and reads the paginated success envelope', async () => {
    const service = TestBed.inject(PartnerApplicationApiService);
    const result = firstValueFrom(service.list('PENDING'));
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/partner-applications/admin?page=1&limit=100&status=PENDING',
    );
    request.flush({
      success: true,
      data: {
        items: [
          {
            id: 'application-1',
            applicantId: 'user-1',
            organizationName: 'Nhóm thiện nguyện',
            representativeName: 'Nguyễn An',
            phone: '0912345678',
            email: 'an@example.test',
            address: 'Hà Nội',
            introduction: 'Hỗ trợ người bệnh.',
            documentKeys: [],
            status: 'PENDING',
            createdAt: '2026-10-15T08:00:00.000Z',
            updatedAt: '2026-10-15T08:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
      },
    });

    await expect(result).resolves.toMatchObject([
      {
        id: 'application-1',
        organizationName: 'Nhóm thiện nguyện',
      },
    ]);
  });
});
