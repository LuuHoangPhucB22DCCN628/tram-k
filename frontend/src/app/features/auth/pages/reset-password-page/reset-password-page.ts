import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { UiButton } from '@shared/ui';
import { AuthService } from '@core/auth/auth.service';

import {
  type AuthFeedback,
  PASSWORD_PATTERN,
  passwordsMatchValidator,
  shouldShowError,
} from '../../auth-form.utils';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, UiButton],
  templateUrl: './reset-password-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly submitted = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly feedback = signal<AuthFeedback | null>(null);
  protected readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  protected readonly isTokenMissing = !this.token;
  protected readonly resetForm = this.formBuilder.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  protected hasError(field: 'password' | 'confirmPassword', errorName: string): boolean {
    return shouldShowError(this.resetForm.controls[field], errorName, this.submitted());
  }

  protected passwordsDoNotMatch(): boolean {
    return (
      this.resetForm.hasError('passwordMismatch') &&
      (this.resetForm.controls.confirmPassword.touched || this.submitted())
    );
  }

  protected submit(): void {
    this.submitted.set(true);
    this.feedback.set(null);

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    if (this.isTokenMissing) {
      this.feedback.set({
        type: 'error',
        message: 'Liên kết đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu liên kết mới.',
      });
      return;
    }

    this.isSubmitting.set(true);
    this.auth.resetPassword(this.token, this.resetForm.controls.password.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.feedback.set({
          type: 'success',
          message: 'Mật khẩu đã được đổi. Các phiên cũ đã đăng xuất; bạn có thể đăng nhập lại.',
        });
        this.resetForm.reset();
        this.submitted.set(false);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.feedback.set({
          type: 'error',
          message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
        });
      },
    });
  }
}
