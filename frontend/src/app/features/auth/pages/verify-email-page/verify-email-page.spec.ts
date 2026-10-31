import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';

import { VerifyEmailPage } from './verify-email-page';

describe('VerifyEmailPage', () => {
  it('verifies the token from the URL and shows success', async () => {
    const auth = {
      verifyEmail: vi.fn(() => of(undefined)),
      resendVerification: vi.fn(),
      refreshAccessToken: vi.fn(() => of('refreshed-token')),
      currentUser: signal(null),
    };
    await TestBed.configureTestingModule({
      imports: [VerifyEmailPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ token: 'token-value' }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(VerifyEmailPage);
    fixture.detectChanges();

    expect(auth.verifyEmail).toHaveBeenCalledWith('token-value');
    expect(fixture.nativeElement.textContent).toContain('Email đã được xác minh');
  });

  it('prefills the email and refreshes an already signed-in account after verification', async () => {
    const auth = {
      verifyEmail: vi.fn(() => of(undefined)),
      resendVerification: vi.fn(() => of(undefined)),
      refreshAccessToken: vi.fn(() => of('refreshed-token')),
      currentUser: signal({ email: 'an@example.com' }),
    };
    await TestBed.configureTestingModule({
      imports: [VerifyEmailPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ token: 'token-value' }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(VerifyEmailPage);
    fixture.detectChanges();

    expect(auth.verifyEmail).toHaveBeenCalledWith('token-value');
    expect(auth.refreshAccessToken).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Email đã được xác minh');
  });
});
