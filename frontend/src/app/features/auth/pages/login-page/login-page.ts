import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthApiError, type LoginCredentials } from '@core/auth/auth.models';
import { AuthService } from '@core/auth/auth.service';

import { type AuthFeedback } from '../../auth-form.utils';
import { LoginForm } from '../../components/login-form/login-form';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [RouterLink, LoginForm],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly feedback = signal<AuthFeedback | null>(null);

  protected login(credentials: LoginCredentials): void {
    this.feedback.set(null);
    this.isSubmitting.set(true);
    this.auth.login(credentials, 'PUBLIC').subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.feedback.set({ type: 'success', message: 'Đăng nhập thành công.' });
        void this.router.navigateByUrl(this.safeReturnUrl());
      },
      error: (error: unknown) => {
        this.isSubmitting.set(false);
        this.feedback.set({ type: 'error', message: this.errorMessage(error) });
      },
    });
  }

  private errorMessage(error: unknown): string {
    if (!(error instanceof AuthApiError)) return 'Không thể đăng nhập. Vui lòng thử lại.';
    if (error.code === 'ACCOUNT_LOCKED') {
      return 'Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.';
    }
    if (error.code === 'WRONG_PORTAL') {
      return 'Tài khoản không phù hợp với khu vực đăng nhập này.';
    }
    return 'Email hoặc mật khẩu không đúng.';
  }

  private safeReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
      ? returnUrl
      : '/';
  }
}
