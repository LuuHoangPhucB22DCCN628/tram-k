import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { AuthApiService } from './auth-api.service';
import { AuthService } from './auth.service';
import type { RegisterCredentials } from './auth.models';

describe('AuthService', () => {
  it.each(['PARTNER', 'ADMIN'])('rejects self-registration as %s', async (role) => {
    const auth = TestBed.inject(AuthService);
    await expect(
      firstValueFrom(
        auth.register({
          displayName: 'Test',
          email: 'test@example.com',
          password: 'Matkhau123',
          role: role as RegisterCredentials['role'],
        }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_REGISTRATION_ROLE' });
    expect(localStorage.getItem('tram-k.auth.registered-accounts')).toBeNull();
  });
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

  it('should update the display name without changing the stored session expiry', () => {
    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'phuc@tramk.vn', password: 'Matkhau123', rememberMe: true }).subscribe();
    const before = JSON.parse(localStorage.getItem('tram-k.auth.persistent') ?? '{}') as {
      sessionExpiresAt: number;
    };

    auth.updateDisplayName('Phúc Trạm K');

    const after = JSON.parse(localStorage.getItem('tram-k.auth.persistent') ?? '{}') as {
      user: { displayName: string };
      sessionExpiresAt: number;
    };
    expect(auth.currentUser()?.displayName).toBe('Phúc Trạm K');
    expect(after.user.displayName).toBe('Phúc Trạm K');
    expect(after.sessionExpiresAt).toBe(before.sessionExpiresAt);
  });

  it('updates the account avatar after a profile is saved', () => {
    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'phuc@tramk.vn', password: 'Matkhau123', rememberMe: false }).subscribe();

    auth.updateProfileSummary('Phúc Trạm K', 'data:image/png;base64,AA==');

    expect(auth.currentUser()).toEqual(
      expect.objectContaining({
        displayName: 'Phúc Trạm K',
        avatarUrl: 'data:image/png;base64,AA==',
      }),
    );
  });

  it.each([
    { email: 'phuc@tramk.vn', route: '/thanh-vien' },
    { email: 'doitac@tramk.vn', route: '/doi-tac' },
    { email: 'admin@tramk.vn', route: '/admin' },
  ])('should send $email to its role home', ({ email, route }) => {
    const auth = TestBed.inject(AuthService);

    auth
      .login(
        { email, password: 'Matkhau123', rememberMe: false },
        email === 'admin@tramk.vn' ? 'ADMIN' : 'PUBLIC',
      )
      .subscribe();

    expect(auth.defaultRoute()).toBe(route);
  });

  it('should reject Admin credentials at the public portal', () => {
    const auth = TestBed.inject(AuthService);
    let errorCode = '';

    auth
      .login({ email: 'admin@tramk.vn', password: 'Matkhau123', rememberMe: true }, 'PUBLIC')
      .subscribe({ error: (error: { code: string }) => (errorCode = error.code) });

    expect(errorCode).toBe('WRONG_PORTAL');
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('should keep an Admin session temporary even when remember-me is requested', () => {
    const auth = TestBed.inject(AuthService);

    auth
      .login({ email: 'admin@tramk.vn', password: 'Matkhau123', rememberMe: true }, 'ADMIN')
      .subscribe();

    expect(sessionStorage.getItem('tram-k.auth.session')).toContain('admin@tramk.vn');
    expect(localStorage.getItem('tram-k.auth.persistent')).toBeNull();
  });

  it('should clear the current browser session after logging out every device', async () => {
    const auth = TestBed.inject(AuthService);
    await firstValueFrom(
      auth.login({ email: 'phuc@tramk.vn', password: 'Matkhau123', rememberMe: true }),
    );

    await firstValueFrom(auth.logoutAll());

    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('tram-k.auth.persistent')).toBeNull();
    expect(sessionStorage.getItem('tram-k.auth.session')).toBeNull();
  });

  it('should clear the current browser session after verifying a new email', async () => {
    const api = TestBed.inject(AuthApiService);
    vi.spyOn(api, 'verifyEmailChange').mockReturnValue(
      of({ email: 'new@example.com', revokedSessions: 2 }),
    );
    const auth = TestBed.inject(AuthService);
    await firstValueFrom(
      auth.login({ email: 'phuc@tramk.vn', password: 'Matkhau123', rememberMe: true }),
    );

    await firstValueFrom(auth.verifyEmailChange('email-change-token'));

    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('tram-k.auth.persistent')).toBeNull();
    expect(sessionStorage.getItem('tram-k.auth.session')).toBeNull();
  });

  it('should preserve the registered display name and verify the password without storing it', async () => {
    const auth = TestBed.inject(AuthService);
    const password = 'Matkhau123';

    await firstValueFrom(
      auth.register({
        displayName: 'Nguyễn An Nhiên',
        email: 'annhien@example.com',
        password,
        role: 'CARER',
      }),
    );

    const storedAccounts = localStorage.getItem('tram-k.auth.registered-accounts') ?? '';
    expect(storedAccounts).toContain('Nguyễn An Nhiên');
    expect(storedAccounts).not.toContain(password);

    await firstValueFrom(auth.login({ email: 'annhien@example.com', password, rememberMe: false }));
    expect(auth.currentUser()?.displayName).toBe('Nguyễn An Nhiên');
    expect(auth.currentUser()?.role).toBe('CARER');
  });

  it('revokes a legacy self-registered partner session without deleting its account', async () => {
    const auth = TestBed.inject(AuthService);
    const user = await firstValueFrom(
      auth.register({
        displayName: 'Legacy',
        email: 'legacy@example.com',
        password: 'Matkhau123',
        role: 'CARER',
      }),
    );
    const accounts = JSON.parse(localStorage.getItem('tram-k.auth.registered-accounts')!);
    accounts[0].user.role = 'PARTNER';
    localStorage.setItem('tram-k.auth.registered-accounts', JSON.stringify(accounts));
    localStorage.setItem(
      'tram-k.auth.persistent',
      JSON.stringify({
        user: { ...user, role: 'PARTNER' },
        rememberMe: true,
        sessionExpiresAt: Date.now() + 60000,
      }),
    );
    TestBed.resetTestingModule();
    const restored = TestBed.inject(AuthService);
    expect(restored.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('tram-k.auth.registered-accounts')).not.toBeNull();
    await expect(
      firstValueFrom(
        restored.login({
          email: user.email,
          password: 'Matkhau123',
          rememberMe: false,
        }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_REGISTRATION_ROLE' });
  });
});
