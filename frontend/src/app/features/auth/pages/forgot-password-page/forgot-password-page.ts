import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { UiButton } from '@shared/ui';
import { AuthService } from '@core/auth/auth.service';

import { type AuthFeedback, shouldShowError } from '../../auth-form.utils';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, UiButton],
  templateUrl: './forgot-password-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly submitted = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly feedback = signal<AuthFeedback | null>(null);
  protected readonly forgotForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected hasError(errorName: string): boolean {
    return shouldShowError(this.forgotForm.controls.email, errorName, this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    this.feedback.set(null);

    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.auth.forgotPassword(this.forgotForm.controls.email.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.feedback.set({
          type: 'success',
          message: 'Nếu email tồn tại, Trạm K sẽ gửi hướng dẫn đặt lại mật khẩu.',
        });
      },
      error: (error: { readonly code?: string }) => {
        this.isSubmitting.set(false);
        this.feedback.set(
          error.code === 'PASSWORD_RESET_RATE_LIMITED'
            ? {
                type: 'error',
                message: 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.',
              }
            : {
                type: 'success',
                message: 'Nếu email tồn tại, Trạm K sẽ gửi hướng dẫn đặt lại mật khẩu.',
              },
        );
      },
    });
  }
}
