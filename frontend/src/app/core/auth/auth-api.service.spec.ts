import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import { AuthApiService } from './auth-api.service';

describe('AuthApiService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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
    sessionStorage.clear();
  });

  it('uses the backend session when login succeeds', async () => {
    const resultPromise = firstValueFrom(
      TestBed.inject(AuthApiService).login(
        { email: 'member@example.com', password: 'Matkhau123', rememberMe: false },
        'PUBLIC',
      ),
    );
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/auth/login',
    );
    expect(request.request.withCredentials).toBe(true);
    request.flush({
      success: true,
      data: {
        user: {
          id: 'user-1',
          displayName: 'Nguyễn An',
          email: 'member@example.com',
          role: 'PATIENT',
        },
        accessToken: 'signed-access-token',
        accessTokenExpiresInSeconds: 900,
      },
    });

    await expect(resultPromise).resolves.toMatchObject({
      accessToken: 'signed-access-token',
      authMode: 'REMOTE',
    });
  });

  it('falls back to local demo auth only in development when the API is unavailable', async () => {
    const resultPromise = firstValueFrom(
      TestBed.inject(AuthApiService).login(
        { email: 'phuc@tramk.vn', password: 'Matkhau123', rememberMe: false },
        'PUBLIC',
      ),
    );
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:3000/auth/login')
      .error(new ProgressEvent('network error'));

    await expect(resultPromise).resolves.toMatchObject({ authMode: 'LOCAL' });
  });

  it('does not create a demo session when the backend rejects the login', async () => {
    const resultPromise = firstValueFrom(
      TestBed.inject(AuthApiService).login(
        { email: 'phuc@tramk.vn', password: 'wrong-password', rememberMe: false },
        'PUBLIC',
      ),
    );
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:3000/auth/login')
      .flush(
        { success: false, error: { message: 'Email hoặc mật khẩu không đúng.' } },
        { status: 401, statusText: 'Unauthorized' },
      );

    await expect(resultPromise).rejects.toMatchObject({ message: 'Email hoặc mật khẩu không đúng.' });
  });

  it('verifies an email token through the backend', async () => {
    const resultPromise = firstValueFrom(
      TestBed.inject(AuthApiService).verifyEmail('verification-token'),
    );
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/auth/verify-email',
    );
    expect(request.request.body).toEqual({ token: 'verification-token' });
    request.flush({ success: true, data: { verified: true, userId: 'user-1' } });

    await expect(resultPromise).resolves.toBeUndefined();
  });

  it('requests a replacement verification email without exposing account existence', async () => {
    const resultPromise = firstValueFrom(
      TestBed.inject(AuthApiService).resendVerification('member@example.com'),
    );
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/auth/resend-verification',
    );
    expect(request.request.body).toEqual({ email: 'member@example.com' });
    request.flush({ success: true, data: { accepted: true } });

    await expect(resultPromise).resolves.toBeUndefined();
  });

  it('requests a password-reset email without exposing account existence', async () => {
    const resultPromise = firstValueFrom(
      TestBed.inject(AuthApiService).forgotPassword('member@example.com'),
    );
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/auth/forgot-password',
    );
    expect(request.request.body).toEqual({ email: 'member@example.com' });
    request.flush({ success: true, data: { accepted: true } });

    await expect(resultPromise).resolves.toBeUndefined();
  });

  it('submits the one-time token with the new password', async () => {
    const resultPromise = firstValueFrom(
      TestBed.inject(AuthApiService).resetPassword('reset-token', 'MatKhauMoiAnToan123'),
    );
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/auth/reset-password',
    );
    expect(request.request.body).toEqual({
      token: 'reset-token',
      password: 'MatKhauMoiAnToan123',
    });
    request.flush({ success: true, data: { reset: true } });

    await expect(resultPromise).resolves.toBeUndefined();
  });

  it('requests an email change without replacing the current session email', async () => {
    const resultPromise = firstValueFrom(
      TestBed.inject(AuthApiService).requestEmailChange(
        'new@example.com',
        'MatKhauHienTai123',
        'REMOTE',
      ),
    );
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/auth/email-change/request',
    );
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({
      newEmail: 'new@example.com',
      currentPassword: 'MatKhauHienTai123',
    });
    request.flush({ success: true, data: { accepted: true, pendingEmail: 'new@example.com' } });

    await expect(resultPromise).resolves.toEqual({ pendingEmail: 'new@example.com' });
  });

  it('verifies the new email and receives the revoked-session count', async () => {
    const resultPromise = firstValueFrom(
      TestBed.inject(AuthApiService).verifyEmailChange('email-change-token'),
    );
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/auth/email-change/verify',
    );
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({ token: 'email-change-token' });
    request.flush({
      success: true,
      data: { changed: true, email: 'new@example.com', revokedSessions: 3 },
    });

    await expect(resultPromise).resolves.toEqual({
      email: 'new@example.com',
      revokedSessions: 3,
    });
  });

  it('logs out every device through the authenticated backend endpoint', async () => {
    const resultPromise = firstValueFrom(TestBed.inject(AuthApiService).logoutAll('REMOTE'));
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/auth/logout-all',
    );
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({});
    request.flush({ success: true, data: { revokedSessions: 3 } });

    await expect(resultPromise).resolves.toBeUndefined();
  });
});
