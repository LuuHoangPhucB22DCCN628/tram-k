import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { type LoginCredentials } from '@core/auth/auth.models';
import { AuthService } from '@core/auth/auth.service';

import { type AuthFeedback } from '../../auth-form.utils';
import { LoginForm } from '../../components/login-form/login-form';

@Component({
  selector: 'app-admin-login-page',
  standalone: true,
  imports: [RouterLink, LoginForm],
  templateUrl: './admin-login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly feedback = signal<AuthFeedback | null>(null);

  protected login(credentials: LoginCredentials): void {
    this.feedback.set(null);
    this.isSubmitting.set(true);
    this.auth.login({ ...credentials, rememberMe: false }, 'ADMIN').subscribe({
      next: () => {
        this.isSubmitting.set(false);
        void this.router.navigateByUrl(this.safeReturnUrl());
      },
      error: () => {
        this.isSubmitting.set(false);
        this.feedback.set({
          type: 'error',
          message: 'Email, mật khẩu hoặc quyền truy cập không hợp lệ.',
        });
      },
    });
  }

  private safeReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/admin/') && !returnUrl.startsWith('/admin/login')
      ? returnUrl
      : '/admin';
  }
}
