import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ResetPasswordPage } from './reset-password-page';

describe('ResetPasswordPage', () => {
  it('should accept matching strong passwords with the demo token', async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordPage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(ResetPasswordPage);
    const component = fixture.componentInstance as unknown as {
      resetForm: { setValue(value: object): void };
      feedback: () => { type: string } | null;
      submit(): void;
    };

    component.resetForm.setValue({ password: 'Matkhau123', confirmPassword: 'Matkhau123' });
    component.submit();

    expect(component.feedback()?.type).toBe('success');
  });
});
