import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';

import { ResetPasswordPage } from './reset-password-page';

describe('ResetPasswordPage', () => {
  it('should submit matching strong passwords with a real token', async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ token: 'a'.repeat(43) }) },
          },
        },
        { provide: AuthService, useValue: { resetPassword: () => of(undefined) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ResetPasswordPage);
    const component = fixture.componentInstance as unknown as {
      resetForm: { setValue(value: object): void };
      feedback: () => { type: string } | null;
      submit(): void;
    };

    component.resetForm.setValue({
      password: 'MatKhauAnToan123',
      confirmPassword: 'MatKhauAnToan123',
    });
    component.submit();

    expect(component.feedback()?.type).toBe('success');
  });
});
