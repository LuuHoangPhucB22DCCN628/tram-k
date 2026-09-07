import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { UiButton } from '@shared/ui';

import {
  type AuthFeedback,
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

  protected readonly submitted = signal(false);
  protected readonly feedback = signal<AuthFeedback | null>(null);
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

  protected submit(): void {
    this.submitted.set(true);
    this.feedback.set(null);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    // Mock quy ước: email này đại diện phản hồi 409 EMAIL_ALREADY_EXISTS.
    if (this.registerForm.controls.email.value.toLowerCase() === 'daco@tramk.vn') {
      this.feedback.set({ type: 'error', message: 'Email này đã được sử dụng.' });
      return;
    }

    this.feedback.set({
      type: 'success',
      message: 'Tạo tài khoản mô phỏng thành công. Bạn có thể chuyển sang trang đăng nhập.',
    });
  }
}
