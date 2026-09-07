import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { UiButton } from '@shared/ui';

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

  protected readonly submitted = signal(false);
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

    // Luôn trả cùng một thông báo để không làm lộ email nào đã có tài khoản.
    this.feedback.set({
      type: 'success',
      message: 'Nếu email tồn tại, Trạm K sẽ gửi hướng dẫn đặt lại mật khẩu.',
    });
  }
}
