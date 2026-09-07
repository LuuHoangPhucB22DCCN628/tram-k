import { TestBed } from '@angular/core/testing';

import type { AuthUser } from '@core/auth/auth.models';

import { ProfileStorageService } from './profile-storage.service';

describe('ProfileStorageService', () => {
  const user: AuthUser = {
    id: 'member-1',
    displayName: 'Phúc',
    email: 'phuc@tramk.vn',
    role: 'PATIENT',
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('creates safe defaults for a new member', () => {
    const profile = TestBed.inject(ProfileStorageService).read(user);

    expect(profile.displayName).toBe('Phúc');
    expect(profile.visibility).toBe('MEMBERS');
    expect(profile.showEmail).toBe(false);
  });

  it('persists profile data by member id', () => {
    const service = TestBed.inject(ProfileStorageService);
    const profile = { ...service.read(user), displayName: 'Phúc Trạm K', city: 'Hà Nội' };

    service.write(user.id, profile);

    expect(service.read(user)).toEqual(profile);
  });
});
