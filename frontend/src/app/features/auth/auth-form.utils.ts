import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export type AuthFeedback =
  | { readonly type: 'success'; readonly message: string }
  | { readonly type: 'error'; readonly message: string };

// Chỉ hiện lỗi sau khi người dùng đã chạm vào ô hoặc đã bấm gửi form.
export function shouldShowError(
  control: AbstractControl,
  errorName: string,
  submitted: boolean,
): boolean {
  return control.hasError(errorName) && (control.touched || submitted);
}

// Validator đặt ở FormGroup để so sánh hai ô mật khẩu.
export const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
};

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
