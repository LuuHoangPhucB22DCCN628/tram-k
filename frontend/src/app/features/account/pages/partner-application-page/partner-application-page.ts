import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { AuthService } from '@core/auth/auth.service';
import { AuthApiError } from '@core/auth/auth.models';
import { PartnerApplicationStorageService } from '../../services/partner-application-storage.service';

type PartnerFieldName =
  'organizationName' | 'representativeName' | 'phone' | 'email' | 'address' | 'introduction';

const PARTNER_FIELD_NAMES: readonly PartnerFieldName[] = [
  'organizationName',
  'representativeName',
  'phone',
  'email',
  'address',
  'introduction',
];

function trimmedLength(minLength: number, maxLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return { required: true };
    if (value.length < minLength) {
      return { minlength: { requiredLength: minLength, actualLength: value.length } };
    }
    if (value.length > maxLength) {
      return { maxlength: { requiredLength: maxLength, actualLength: value.length } };
    }
    return null;
  };
}

@Component({
  selector: 'app-partner-application-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './partner-application-page.html',
  styleUrl: './partner-application-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerApplicationPage {
  private readonly auth = inject(AuthService);
  private readonly storage = inject(PartnerApplicationStorageService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly submitted = signal(false);
  protected readonly feedback = signal('');
  protected readonly feedbackIsError = signal(false);
  protected readonly submitting = signal(false);
  protected readonly sendingVerification = signal(false);
  protected readonly verificationFeedback = signal('');
  protected readonly verificationFeedbackIsError = signal(false);
  protected readonly documentNames = signal<readonly string[]>([]);
  private readonly selectedDocumentFiles = signal<readonly File[]>([]);
  protected readonly documentError = signal('');
  protected readonly currentApplication = computed(() => {
    const user = this.auth.currentUser();
    return user ? this.storage.forApplicant(user.id) : null;
  });
  protected readonly needsEmailVerification = computed(
    () => this.auth.currentUser()?.status === 'PENDING_VERIFY',
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    organizationName: ['', [trimmedLength(3, 150)]],
    representativeName: ['', [trimmedLength(2, 100)]],
    phone: ['', [Validators.required, Validators.pattern(/^(0|\+84)[0-9]{9,10}$/)]],
    email: ['', [Validators.required, Validators.email]],
    address: ['', [trimmedLength(10, 300)]],
    introduction: ['', [trimmedLength(30, 2000)]],
    consent: [false, Validators.requiredTrue],
  });

  constructor() {
    const user = this.auth.currentUser();
    if (user) this.storage.initializeMine(user.id);
  }

  protected selectDocuments(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    this.feedback.set('');
    this.feedbackIsError.set(false);
    if (files.length === 0) {
      this.documentNames.set([]);
      this.selectedDocumentFiles.set([]);
      this.documentError.set('Vui lòng đính kèm ít nhất một hồ sơ minh chứng.');
      return;
    }
    if (files.length > 10) {
      this.clearDocumentInput(input, 'Chỉ được đính kèm tối đa 10 tệp.');
      return;
    }
    if (files.some((file) => !allowedTypes.includes(file.type))) {
      this.clearDocumentInput(input, 'Chỉ hỗ trợ tệp PDF, JPG hoặc PNG.');
      return;
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      this.clearDocumentInput(input, 'Mỗi tệp minh chứng không được vượt quá 5 MB.');
      return;
    }
    this.documentNames.set(files.map((file) => file.name));
    this.selectedDocumentFiles.set(files);
    this.documentError.set('');
  }

  protected submit(): void {
    if (this.submitting()) return;
    if (this.needsEmailVerification()) return;
    this.submitted.set(true);
    this.feedback.set('');
    this.feedbackIsError.set(false);
    this.form.markAllAsTouched();
    const user = this.auth.currentUser();
    if (!user) {
      this.feedback.set('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại trước khi gửi hồ sơ.');
      this.feedbackIsError.set(true);
      return;
    }
    if (this.documentNames().length === 0) {
      this.documentError.set('Vui lòng đính kèm ít nhất một hồ sơ minh chứng.');
    }
    if (this.form.invalid || this.documentNames().length === 0) {
      return;
    }
    if (this.auth.authMode() !== 'REMOTE') {
      this.feedback.set(
        'Bạn đang dùng phiên đăng nhập tạm khi máy chủ chưa hoạt động. Vui lòng đăng xuất và đăng nhập lại để gửi hồ sơ.',
      );
      this.feedbackIsError.set(true);
      return;
    }
    const value = this.form.getRawValue();
    const input = {
      organizationName: value.organizationName,
      representativeName: value.representativeName,
      phone: value.phone,
      email: value.email,
      address: value.address,
      introduction: value.introduction,
    };
    const files = this.selectedDocumentFiles();
    if (!files.length) {
      this.documentError.set('Vui lòng chọn lại tệp minh chứng trước khi gửi.');
      return;
    }
    this.submitting.set(true);
    this.storage.submitRemote(input, files).subscribe((application) => {
      this.finishSubmit(application);
    });
  }

  protected requestVerification(): void {
    const user = this.auth.currentUser();
    if (!user || !this.needsEmailVerification() || this.sendingVerification()) return;

    this.sendingVerification.set(true);
    this.verificationFeedback.set('');
    this.verificationFeedbackIsError.set(false);
    this.auth.resendVerification(user.email).subscribe({
      next: () => {
        this.sendingVerification.set(false);
        this.verificationFeedback.set(
          'Yêu cầu đã được ghi nhận. Vui lòng kiểm tra hộp thư và mục thư rác.',
        );
      },
      error: (error: unknown) => {
        this.sendingVerification.set(false);
        this.verificationFeedbackIsError.set(true);
        this.verificationFeedback.set(
          error instanceof AuthApiError
            ? error.message
            : 'Chưa thể gửi yêu cầu xác minh. Vui lòng thử lại sau.',
        );
      },
    });
  }

  protected showFieldError(name: PartnerFieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected fieldError(name: PartnerFieldName): string {
    const control = this.form.controls[name];
    if (control.hasError('required')) return 'Trường này không được để trống.';
    if (control.hasError('email')) return 'Email chưa đúng định dạng, ví dụ ten@example.com.';
    if (control.hasError('pattern')) {
      return 'Số điện thoại phải bắt đầu bằng 0 hoặc +84 và có 10–11 chữ số.';
    }
    const minimum = control.getError('minlength')?.requiredLength as number | undefined;
    if (minimum) return `Vui lòng nhập ít nhất ${minimum} ký tự.`;
    const maximum = control.getError('maxlength')?.requiredLength as number | undefined;
    if (maximum) return `Nội dung không được vượt quá ${maximum} ký tự.`;
    return '';
  }

  protected invalidFieldCount(): number {
    return PARTNER_FIELD_NAMES.filter((name) => this.form.controls[name].invalid).length;
  }

  protected statusLabel(status: string): string {
    return (
      { PENDING: 'Đang chờ duyệt', APPROVED: 'Đã được duyệt', REJECTED: 'Cần bổ sung' }[status] ??
      status
    );
  }

  private clearDocumentInput(input: HTMLInputElement, message: string): void {
    this.documentNames.set([]);
    this.selectedDocumentFiles.set([]);
    this.documentError.set(message);
    input.value = '';
  }

  private finishSubmit(application: unknown): void {
    this.submitting.set(false);
    this.feedback.set(
      application
        ? 'Hồ sơ đã được gửi và đang chờ quản trị viên duyệt.'
        : this.storage.lastError() || 'Không thể gửi hồ sơ lên máy chủ. Vui lòng thử lại.',
    );
    this.feedbackIsError.set(!application);
  }
}
