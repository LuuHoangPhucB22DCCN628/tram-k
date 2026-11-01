import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';
import { AccountNotificationStorageService } from './account-notification-storage.service';
import { CharityProgramRegistrationService } from './charity-program-registration.service';

describe('CharityProgramRegistrationService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('registers through the current programs API with an idempotency key', async () => {
    const service = TestBed.inject(CharityProgramRegistrationService);
    const resultPromise = firstValueFrom(
      service.registerRemote('PROGRAM-A', 'MEMBER-A', 10, {
        displayName: 'Nguyễn An',
        email: 'an@example.com',
      }),
    );

    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/programs/PROGRAM-A/registrations',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('x-idempotency-key')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    request.flush({
      success: true,
      data: {
        programId: 'PROGRAM-A',
        userId: 'MEMBER-A',
        applicantName: 'Nguyễn An',
        applicantEmail: 'an@example.com',
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'CONFIRMED',
      },
    });

    await expect(resultPromise).resolves.toBe('CREATED');
  });

  it('prevents duplicate registrations and respects program capacity', () => {
    const service = TestBed.inject(CharityProgramRegistrationService);

    expect(service.register('PROGRAM-A', 'MEMBER-A', 1)).toBe('CREATED');
    expect(service.register('PROGRAM-A', 'MEMBER-A', 1)).toBe('DUPLICATE');
    expect(service.register('PROGRAM-A', 'MEMBER-B', 1)).toBe('FULL');
    expect(service.registrationsFor('MEMBER-A')).toHaveLength(1);
  });

  it('allows a member to cancel a registration', () => {
    const service = TestBed.inject(CharityProgramRegistrationService);
    service.register('PROGRAM-A', 'MEMBER-A', 10);

    expect(service.unregister('PROGRAM-A', 'MEMBER-A')).toBe(true);
    expect(service.unregister('PROGRAM-A', 'MEMBER-A')).toBe(false);
  });

  it('supports confirmation, rejection and completion while reopening rejected capacity', () => {
    const service = TestBed.inject(CharityProgramRegistrationService);
    service.register('PROGRAM-A', 'MEMBER-A', 2, {
      displayName: 'Nguyễn An',
      email: 'an@example.com',
    });
    service.register('PROGRAM-A', 'MEMBER-B', 2, {
      displayName: 'Trần Bình',
      email: 'binh@example.com',
    });

    expect(service.review('PROGRAM-A', 'MEMBER-A', 'CONFIRMED')).toBe(true);
    expect(service.complete('PROGRAM-A', 'MEMBER-A')).toBe(true);
    expect(service.unregister('PROGRAM-A', 'MEMBER-A')).toBe(false);
    expect(service.review('PROGRAM-A', 'MEMBER-B', 'REJECTED', 'Quá xa khu vực hỗ trợ.')).toBe(
      true,
    );
    expect(service.countFor('PROGRAM-A')).toBe(1);
    expect(service.register('PROGRAM-A', 'MEMBER-C', 2)).toBe('CREATED');
    expect(service.registrationsForProgram('PROGRAM-A')).toHaveLength(3);

    const notificationKinds = TestBed.inject(AccountNotificationStorageService)
      .notificationsFor('MEMBER-A')
      .map((notification) => notification.kind);
    expect(notificationKinds).toEqual(
      expect.arrayContaining([
        'PROGRAM_REGISTRATION_SENT',
        'PROGRAM_REGISTRATION_CONFIRMED',
        'PROGRAM_REGISTRATION_COMPLETED',
      ]),
    );
  });

  it('requires a meaningful rejection reason', () => {
    const service = TestBed.inject(CharityProgramRegistrationService);
    service.register('PROGRAM-A', 'MEMBER-A', 10);

    expect(service.review('PROGRAM-A', 'MEMBER-A', 'REJECTED', 'Ngắn')).toBe(false);
    expect(service.registrationsFor('MEMBER-A')[0].status).toBe('PENDING_CONFIRMATION');
  });
});
