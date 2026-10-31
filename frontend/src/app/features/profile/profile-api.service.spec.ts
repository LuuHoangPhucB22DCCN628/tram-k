import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import type { AuthUser } from '@core/auth/auth.models';
import { API_BASE_URL } from '@core/config/api-base-url.token';

import { ProfileApiService } from './profile-api.service';

describe('ProfileApiService', () => {
  const user: AuthUser = {
    id: 'user-1',
    displayName: 'Nguyễn An',
    email: 'member@example.com',
    role: 'PATIENT',
  };
  const profile = {
    version: 3,
    displayName: 'Nguyễn An',
    phone: '0912345678',
    city: 'Hà Nội',
    birthYear: '1994',
    bio: '',
    avatarDataUrl: null,
    visibility: 'MEMBERS' as const,
    showEmail: false,
    allowComments: true,
  };

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

  it('loads the owned profile from the backend for a remote session', async () => {
    const resultPromise = firstValueFrom(
      TestBed.inject(ProfileApiService).getOwnProfile(user, 'REMOTE'),
    );
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/profile/me',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, data: { ...profile, birthYear: 1994 } });

    await expect(resultPromise).resolves.toEqual(profile);
  });

  it('sends expectedVersion and converts birthYear when updating', async () => {
    const resultPromise = firstValueFrom(
      TestBed.inject(ProfileApiService).updateOwnProfile(user, 'REMOTE', profile),
    );
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/profile/me',
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(
      expect.objectContaining({ expectedVersion: 3, birthYear: 1994 }),
    );
    request.flush({ success: true, data: { ...profile, version: 4, birthYear: 1994 } });

    await expect(resultPromise).resolves.toEqual({ ...profile, version: 4 });
  });

  it('keeps local storage as the explicit mock session fallback', async () => {
    const service = TestBed.inject(ProfileApiService);
    const saved = await firstValueFrom(service.updateOwnProfile(user, 'LOCAL', profile));

    expect(saved.version).toBe(4);
    await expect(firstValueFrom(service.getOwnProfile(user, 'LOCAL'))).resolves.toEqual(saved);
  });

  it('explains an oversized avatar response instead of showing a generic error', async () => {
    const resultPromise = firstValueFrom(
      TestBed.inject(ProfileApiService).updateOwnProfile(user, 'REMOTE', profile),
    );
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/profile/me',
    );
    request.flush(null, { status: 413, statusText: 'Payload Too Large' });

    await expect(resultPromise).rejects.toMatchObject({
      code: 'VALIDATION',
      message: expect.stringContaining('chọn ảnh khác'),
    });
  });
});
