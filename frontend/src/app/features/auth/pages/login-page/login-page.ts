import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

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

  protected readonly submitted = signal(false);
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

    // Mock quy ước: email này đại diện cho lỗi tài khoản bị khóa từ API.
    if (this.loginForm.controls.email.value.toLowerCase() === 'khoa@tramk.vn') {
      this.feedback.set({
        type: 'error',
        message: 'Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.',
      });
      return;
    }

    this.feedback.set({
      type: 'success',
      message: 'Đăng nhập mô phỏng thành công. Phiên đăng nhập thật sẽ được nối ở P3-05.',
    });
  }
}
