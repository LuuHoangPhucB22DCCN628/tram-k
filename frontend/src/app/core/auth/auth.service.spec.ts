import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should keep the access token out of browser storage', () => {
    const auth = TestBed.inject(AuthService);

    auth.login({ email: 'phuc@tramk.vn', password: 'Matkhau123', rememberMe: false }).subscribe();

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.accessToken()).toContain('mock-access');
    expect(sessionStorage.getItem('tram-k.auth.session')).not.toContain('mock-access');
  });

  it('should restore a valid remembered session', () => {
    localStorage.setItem(
      'tram-k.auth.persistent',
      JSON.stringify({
        user: {
          id: 'USR-DEMO',
          displayName: 'Thành viên Trạm K',
          email: 'phuc@tramk.vn',
          role: 'PATIENT',
        },
        rememberMe: true,
        sessionExpiresAt: Date.now() + 60_000,
      }),
    );

    const auth = TestBed.inject(AuthService);

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.currentUser()?.email).toBe('phuc@tramk.vn');
    expect(auth.accessToken()).toContain('mock-access');
  });
});
