import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import type { LoginCredentials } from '@core/auth/auth.models';
import { UiButton } from '@shared/ui';

import { type AuthFeedback, shouldShowError } from '../../auth-form.utils';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, UiButton],
  templateUrl: './login-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginForm {
  private readonly formBuilder = inject(FormBuilder);

  readonly showRememberMe = input(true);
  readonly showForgotPassword = input(true);
  readonly submitLabel = input('Đăng nhập');
  readonly isSubmitting = input(false);
  readonly feedback = input<AuthFeedback | null>(null);
  readonly credentialsSubmitted = output<LoginCredentials>();

  protected readonly submitted = signal(false);
  protected readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false],
  });

  protected hasError(field: 'email' | 'password', errorName: string): boolean {
    return shouldShowError(this.loginForm.controls[field], errorName, this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const credentials = this.loginForm.getRawValue();
    this.credentialsSubmitted.emit({
      ...credentials,
      rememberMe: this.showRememberMe() ? credentials.rememberMe : false,
    });
  }
}
