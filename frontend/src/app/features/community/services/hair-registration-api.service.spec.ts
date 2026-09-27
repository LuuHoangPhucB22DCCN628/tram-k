import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import { HairRegistrationApiError } from '../models/hair-registration.models';
import { HairRegistrationApiService } from './hair-registration-api.service';

describe('HairRegistrationApiService', () => {
  const request = {
    mode: 'receive' as const,
    fullName: 'Nguyễn Văn An',
    phone: '0912345678',
    province: 'Hà Nội',
    district: 'Ba Đình',
    address: '12 Phố Huế',
    gender: 'male' as const,
    relativePhone: '0987654321',
    relativeName: 'Nguyễn Thị Mai',
    duration: '3 tháng',
    hospital: 'Bệnh viện K',
    diagnosis: 'Ung thư tuyến giáp',
    borrowDate: '2099-01-01',
    transparency: 'Tôi cam kết thông tin đã điền là đúng.',
  };

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

  it('posts to the hair-registration endpoint and unwraps the receipt', () => {
    let receiptId = '';
    TestBed.inject(HairRegistrationApiService)
      .submit(request)
      .subscribe((receipt) => (receiptId = receipt.id));

    const pendingRequest = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/community/hair-registrations',
    );
    expect(pendingRequest.request.method).toBe('POST');
    expect(pendingRequest.request.body).toEqual(request);
    pendingRequest.flush({
      success: true,
      data: {
        id: 'TK-20260926-ABCD1234',
        status: 'PENDING',
        submittedAt: '2026-09-26T10:00:00.000Z',
      },
    });

    expect(receiptId).toBe('TK-20260926-ABCD1234');
  });

  it('maps the API error envelope to a safe domain error', () => {
    let receivedError: unknown;
    TestBed.inject(HairRegistrationApiService)
      .submit(request)
      .subscribe({ error: (error: unknown) => (receivedError = error) });

    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:3000/community/hair-registrations')
      .flush(
        { success: false, error: { code: 'HTTP_400', message: 'Thông tin chưa hợp lệ.' } },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(receivedError).toBeInstanceOf(HairRegistrationApiError);
    expect((receivedError as Error).message).toBe('Thông tin chưa hợp lệ.');
  });
});
