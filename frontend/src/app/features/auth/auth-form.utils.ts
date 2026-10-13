import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export type AuthFeedback =
  | { readonly type: 'success'; readonly message: string }
  | { readonly type: 'error'; readonly message: string };

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

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

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{15,128}$/;

export function getPasswordValidationMessage(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự (hiện có ${password.length}).`;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Mật khẩu không được vượt quá ${PASSWORD_MAX_LENGTH} ký tự.`;
  }

  if (!/[A-Z]/.test(password)) {
    return 'Mật khẩu cần có ít nhất một chữ hoa.';
  }

  if (!/[a-z]/.test(password)) {
    return 'Mật khẩu cần có ít nhất một chữ thường.';
  }

  if (!/\d/.test(password)) {
    return 'Mật khẩu cần có ít nhất một chữ số.';
  }

  return null;
}
