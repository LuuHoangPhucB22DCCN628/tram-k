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
  protected readonly resendIsError = signal(false);
  protected readonly sendingResend = signal(false);
  protected readonly resendForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    this.resendForm.controls.email.setValue(
      this.route.snapshot.queryParamMap.get('email')?.trim() ??
        this.auth.currentUser()?.email ??
        '',
    );
    const token = this.route.snapshot.queryParamMap.get('token')?.trim();
    if (!token) {
      this.state.set('missing');
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: () => {
        if (!this.auth.currentUser()) {
          this.state.set('success');
          return;
        }
        this.auth.refreshAccessToken().subscribe({
          next: () => this.state.set('success'),
          error: () => this.state.set('success'),
        });
      },
      error: () => this.state.set('error'),
    });
  }

  protected resend(): void {
    if (this.sendingResend()) return;
    this.resendMessage.set(null);
    this.resendIsError.set(false);
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }
    this.sendingResend.set(true);
    this.auth.resendVerification(this.resendForm.controls.email.value).subscribe({
      next: () => {
        this.sendingResend.set(false);
        this.resendMessage.set('Nếu tài khoản đang chờ xác minh, Trạm K sẽ gửi một liên kết mới.');
      },
      error: (error: unknown) => {
        this.sendingResend.set(false);
        this.resendIsError.set(true);
        this.resendMessage.set(
          error instanceof AuthApiError && error.code === 'VERIFICATION_RATE_LIMITED'
            ? 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.'
            : error instanceof AuthApiError
              ? error.message
              : 'Chưa thể gửi lại email. Vui lòng thử lại.',
        );
      },
    });
  }

  protected continue(): void {
    void this.router.navigateByUrl(
      this.auth.currentUser() ? '/thanh-vien/dang-ky-doi-tac' : '/dang-nhap',
    );
  }
}
