import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('remote session restoration', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('refreshes a stored remote session without logging the user out on page reload', async () => {
    sessionStorage.setItem(
      'tram-k.auth.session',
      JSON.stringify({
        user: { id: 'user-1', displayName: 'Nguyễn An', email: 'an@example.com', role: 'PATIENT' },
        rememberMe: false,
        authMode: 'REMOTE',
        sessionExpiresAt: Date.now() + 60_000,
      }),
    );

    const auth = TestBed.inject(AuthService);
    await Promise.resolve();
    const refresh = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/auth/refresh',
    );
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush({
      success: true,
      data: {
        user: { id: 'user-1', displayName: 'Nguyễn An', email: 'an@example.com', role: 'PATIENT' },
        accessToken: 'new-access-token',
        accessTokenExpiresInSeconds: 900,
      },
    });

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.accessToken()).toBe('new-access-token');
  });

  it('shares one refresh request when another request also needs a token', async () => {
    sessionStorage.setItem(
      'tram-k.auth.session',
      JSON.stringify({
        user: { id: 'user-1', displayName: 'Nguyễn An', email: 'an@example.com', role: 'PATIENT' },
        rememberMe: false,
        authMode: 'REMOTE',
        sessionExpiresAt: Date.now() + 60_000,
      }),
    );

    const auth = TestBed.inject(AuthService);
    await Promise.resolve();
    let secondToken: string | null = null;
    auth.refreshAccessToken().subscribe((token) => (secondToken = token));

    const http = TestBed.inject(HttpTestingController);
    const refresh = http.expectOne('http://localhost:3000/auth/refresh');
    refresh.flush({
      success: true,
      data: {
        user: { id: 'user-1', displayName: 'Nguyễn An', email: 'an@example.com', role: 'PATIENT' },
        accessToken: 'shared-access-token',
        accessTokenExpiresInSeconds: 900,
      },
    });

    http.expectNone('http://localhost:3000/auth/refresh');
    expect(secondToken).toBe('shared-access-token');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('clears an expired remote session without retrying refresh recursively', async () => {
    sessionStorage.setItem(
      'tram-k.auth.session',
      JSON.stringify({
        user: { id: 'user-1', displayName: 'Nguyễn An', email: 'an@example.com', role: 'PATIENT' },
        rememberMe: false,
        authMode: 'REMOTE',
        sessionExpiresAt: Date.now() + 60_000,
      }),
    );

    const auth = TestBed.inject(AuthService);
    await Promise.resolve();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('http://localhost:3000/auth/refresh')
      .flush(
        { error: { message: 'Phiên đăng nhập đã hết hạn.' } },
        { status: 401, statusText: 'Unauthorized' },
      );

    http.expectNone('http://localhost:3000/auth/refresh');
    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('tram-k.auth.session')).toBeNull();
  });
});
