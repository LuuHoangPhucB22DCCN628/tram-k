import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ForgotPasswordPage } from './forgot-password-page';

describe('ForgotPasswordPage', () => {
  it('should show a neutral success response for a valid email', async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(ForgotPasswordPage);
    const component = fixture.componentInstance as unknown as {
      forgotForm: { setValue(value: object): void };
      feedback: () => { type: string } | null;
      submit(): void;
    };

    component.forgotForm.setValue({ email: 'nguoidung@tramk.vn' });
    component.submit();

    expect(component.feedback()?.type).toBe('success');
  });
});
