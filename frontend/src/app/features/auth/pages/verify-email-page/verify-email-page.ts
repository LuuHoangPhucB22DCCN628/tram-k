import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthApiError } from '@core/auth/auth.models';
import { AuthService } from '@core/auth/auth.service';
import { UiButton } from '@shared/ui';

type VerificationState = 'loading' | 'success' | 'error' | 'missing';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, UiButton],
  templateUrl: './verify-email-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly state = signal<VerificationState>('loading');
  protected readonly resendMessage = signal<string | null>(null);
  protected readonly resendForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim();
    if (!token) {
      this.state.set('missing');
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: () => this.state.set('success'),
      error: () => this.state.set('error'),
    });
  }

  protected resend(): void {
    this.resendMessage.set(null);
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }
    this.auth.resendVerification(this.resendForm.controls.email.value).subscribe({
      next: () =>
        this.resendMessage.set('Nếu tài khoản đang chờ xác minh, Trạm K sẽ gửi một liên kết mới.'),
      error: (error: unknown) =>
        this.resendMessage.set(
          error instanceof AuthApiError && error.code === 'VERIFICATION_RATE_LIMITED'
            ? 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.'
            : 'Chưa thể gửi lại email. Vui lòng thử lại.',
        ),
    });
  }

  protected goToLogin(): void {
    void this.router.navigateByUrl('/dang-nhap');
  }
}
