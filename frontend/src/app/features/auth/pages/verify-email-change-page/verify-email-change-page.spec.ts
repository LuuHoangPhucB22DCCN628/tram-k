import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';

import { VerifyEmailChangePage } from './verify-email-change-page';

describe('VerifyEmailChangePage', () => {
  it('shows the new email after successful verification', async () => {
    const auth = {
      verifyEmailChange: vi
        .fn()
        .mockReturnValue(of({ email: 'new@example.com', revokedSessions: 2 })),
    };
    await TestBed.configureTestingModule({
      imports: [VerifyEmailChangePage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => 'email-change-token' } } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(VerifyEmailChangePage);
    fixture.detectChanges();

    expect(auth.verifyEmailChange).toHaveBeenCalledWith('email-change-token');
    expect(fixture.nativeElement.textContent).toContain('new@example.com');
    expect(fixture.nativeElement.textContent).toContain('Mọi phiên đăng nhập cũ đã được thu hồi');
  });
});
