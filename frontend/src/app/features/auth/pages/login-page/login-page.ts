import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthApiError } from '@core/auth/auth.models';
import { AuthService } from '@core/auth/auth.service';
import { UiButton } from '@shared/ui';

import { type AuthFeedback, shouldShowError } from '../../auth-form.utils';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, UiButton],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly submitted = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly feedback = signal<AuthFeedback | null>(null);
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
    this.feedback.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.auth.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.feedback.set({ type: 'success', message: 'Đăng nhập thành công.' });
        void this.router.navigateByUrl(this.safeReturnUrl());
      },
      error: (error: unknown) => {
        this.isSubmitting.set(false);
        const message =
          error instanceof AuthApiError && error.code === 'ACCOUNT_LOCKED'
            ? 'Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.'
            : 'Email hoặc mật khẩu không đúng.';
        this.feedback.set({ type: 'error', message });
      },
    });
  }

  private safeReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
      ? returnUrl
      : this.auth.defaultRoute();
  }
}
