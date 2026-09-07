import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LoginPage } from './login-page';

describe('LoginPage', () => {
  it('should validate required credentials and accept a valid mock login', async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginPage);
    const component = fixture.componentInstance as unknown as {
      loginForm: { setValue(value: object): void; valid: boolean };
      feedback: () => { type: string } | null;
      submit(): void;
    };

    component.submit();
    expect(component.loginForm.valid).toBe(false);

    component.loginForm.setValue({
      email: 'phuc@tramk.vn',
      password: 'Matkhau123',
      rememberMe: true,
    });
    component.submit();

    expect(component.feedback()?.type).toBe('success');
  });
});
