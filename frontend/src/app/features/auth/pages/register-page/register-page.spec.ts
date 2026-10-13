import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RegisterPage } from './register-page';

describe('RegisterPage', () => {
  let fixture: ComponentFixture<RegisterPage>;
  let component: RegisterPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should reject mismatched passwords', () => {
    const page = component as unknown as {
      registerForm: { patchValue(value: object): void; hasError(name: string): boolean };
    };

    page.registerForm.patchValue({ password: 'Matkhau123', confirmPassword: 'Khac1234A' });

    expect(page.registerForm.hasError('passwordMismatch')).toBe(true);
  });

  it('should explain why Phuc12345678 is invalid', () => {
    const page = component as unknown as {
      registerForm: { patchValue(value: object): void };
      submit(): void;
    };

    page.registerForm.patchValue({
      password: 'Phuc12345678',
      confirmPassword: 'Phuc12345678',
    });
    page.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Mật khẩu cần ít nhất 15 ký tự (hiện có 12).',
    );
  });

  it('should reveal each password field independently', () => {
    const host = fixture.nativeElement as HTMLElement;
    const password = host.querySelector<HTMLInputElement>('#register-password');
    const confirmation = host.querySelector<HTMLInputElement>('#register-confirm-password');
    const toggles = host.querySelectorAll<HTMLButtonElement>('.auth-form__password-toggle');

    expect(password?.type).toBe('password');
    expect(confirmation?.type).toBe('password');

    toggles[0]?.click();
    fixture.detectChanges();

    expect(password?.type).toBe('text');
    expect(confirmation?.type).toBe('password');
  });
});
