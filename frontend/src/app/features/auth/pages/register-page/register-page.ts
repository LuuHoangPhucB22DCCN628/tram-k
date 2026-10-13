import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthApiError, type RegisterCredentials } from '@core/auth/auth.models';
import { AuthService } from '@core/auth/auth.service';
import { UiButton } from '@shared/ui';

import {
  type AuthFeedback,
  getPasswordValidationMessage,
  PASSWORD_PATTERN,
  passwordsMatchValidator,
  shouldShowError,
} from '../../auth-form.utils';

type RegisterField = 'displayName' | 'email' | 'role' | 'password' | 'confirmPassword' | 'terms';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, UiButton],
  templateUrl: './register-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly submitted = signal(false);
  protected readonly feedback = signal<AuthFeedback | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly registerForm = this.formBuilder.nonNullable.group(
    {
      displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['PATIENT', Validators.required],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
    },
    { validators: passwordsMatchValidator },
  );

  protected hasError(field: RegisterField, errorName: string): boolean {
    return shouldShowError(this.registerForm.controls[field], errorName, this.submitted());
  }

  protected passwordsDoNotMatch(): boolean {
    return (
      this.registerForm.hasError('passwordMismatch') &&
      (this.registerForm.controls.confirmPassword.touched || this.submitted())
    );
  }

  protected passwordValidationMessage(): string {
    return (
      getPasswordValidationMessage(this.registerForm.controls.password.value) ??
      'Mật khẩu chưa đáp ứng yêu cầu.'
    );
  }

  protected submit(): void {
    this.submitted.set(true);
    this.feedback.set(null);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const value = this.registerForm.getRawValue();
    this.auth
      .register({
        displayName: value.displayName,
        email: value.email,
        password: value.password,
        role: value.role as RegisterCredentials['role'],
      })
      .subscribe({
        next: () =>
          this.feedback.set({
            type: 'success',
            message: 'Tạo tài khoản thành công. Vui lòng kiểm tra email để xác minh tài khoản.',
          }),
        error: (error: unknown) =>
          this.feedback.set({
            type: 'error',
            message:
              error instanceof AuthApiError && error.code === 'EMAIL_ALREADY_EXISTS'
                ? 'Email này đã được sử dụng.'
                : 'Chưa thể tạo tài khoản. Vui lòng thử lại.',
          }),
      });
  }
}
