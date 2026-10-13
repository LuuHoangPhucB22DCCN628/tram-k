import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';

import { VerifyEmailPage } from './verify-email-page';

describe('VerifyEmailPage', () => {
  it('verifies the token from the URL and shows success', async () => {
    const auth = { verifyEmail: vi.fn(() => of(undefined)), resendVerification: vi.fn() };
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
});
