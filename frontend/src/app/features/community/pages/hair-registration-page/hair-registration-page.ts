import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize, take } from 'rxjs';

import {
  HairRegistrationApiError,
  type HairRegistrationGender,
  type HairRegistrationMode,
  type HairRegistrationRequest,
} from '../../models/hair-registration.models';
import { HairRegistrationService } from '../../services/hair-registration.service';

interface RegistrationCopy {
  readonly title: string;
  readonly addressPlaceholder: string;
  readonly banner: string;
  readonly variant: HairRegistrationMode;
}

const REGISTRATION_COPY: Record<HairRegistrationMode, RegistrationCopy> = {
  receive: {
    title: 'Đăng ký tham gia nhận tóc',
    addressPlaceholder: 'Địa chỉ nhận tóc',
    banner: '/assets/images/community/community-hair-receive-banner.png',
    variant: 'receive',
  },
  donate: {
    title: 'Đăng ký tham gia hiến tóc',
    addressPlaceholder: 'Địa chỉ nơi đang sống',
    banner: '/assets/images/community/community-hair-donate-banner.png',
    variant: 'donate',
  },
};

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length === 0
    ? { trimmedRequired: true }
    : null;

const fullName: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(value)) return { personName: true };
  return value.split(/\s+/).length >= 2 ? null : { fullName: true };
};

const containsLetter: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  return !value || /\p{L}/u.test(value) ? null : { containsLetter: true };
};

const vietnamesePhone: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').replace(/[\s.-]/g, '');
  return !value || /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/.test(value) ? null : { phone: true };
};

const expectedDuration: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  const match = value.match(/^(\d{1,2})\s*(?:tháng|thang)$/i);
  const months = Number(match?.[1]);
  return match && months >= 1 && months <= 12 ? null : { duration: true };
};

const todayOrFuture: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '');
  if (!value) return null;
  const selected = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Number.isNaN(selected.getTime()) || selected < today ? { pastDate: true } : null;
};

const donatedHairLength: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  const match = value.match(/^(\d{1,2}(?:[.,]\d)?)\s*cm$/i);
  const centimeters = Number(match?.[1]?.replace(',', '.') ?? Number.NaN);
  return match && centimeters >= 20 && centimeters <= 80 ? null : { hairLength: true };
};

@Component({
  selector: 'app-hair-registration-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './hair-registration-page.html',
  styleUrl: './hair-registration-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HairRegistrationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly registrationService = inject(HairRegistrationService);

  protected readonly submitted = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal('');
  protected readonly submitError = signal('');

  protected readonly copy =
    REGISTRATION_COPY[this.route.snapshot.data['mode'] as HairRegistrationMode] ??
    REGISTRATION_COPY.receive;

  protected readonly donorCommitments = [
    'Tôi hoàn toàn tự nguyện hiến tặng phần tóc của mình cho chương trình Thư viện Tóc, không vì mục đích thương mại, không bị ép buộc hay lừa dối dưới bất kỳ hình thức nào.',
    'Phần tóc tôi hiến là tóc thật của cá nhân tôi, được cắt trong điều kiện vệ sinh thông thường, không dính máu, không dính dịch cơ thể.*',
    'Tôi đồng ý để phần tóc hiến được sử dụng cho mục đích làm tóc giả từ tóc thật nhằm trao tặng cho người bệnh bị rụng tóc trong quá trình điều trị bệnh như ung thư hoặc các bệnh lý khác.*',
    'Không yêu cầu hoàn trả hoặc bồi hoàn: Tôi hiểu và đồng ý rằng: Phần tóc hiến sẽ không được hoàn trả dưới bất kỳ hình thức nào. Tôi không yêu cầu thanh toán, bồi thường hoặc quyền lợi vật chất liên quan đến phần tóc đã hiến.*',
    'Tôi cam kết không khiếu nại, không tranh chấp, không đưa ra bất kỳ yêu cầu pháp lý nào liên quan đến việc sử dụng phần tóc hiến, miễn là việc sử dụng phù hợp với mục đích nhân đạo của chương trình.*',
  ] as const;

  protected readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, trimmedRequired, Validators.maxLength(80), fullName]],
    phone: ['', [Validators.required, vietnamesePhone]],
    email: ['', [Validators.email, Validators.maxLength(120)]],
    province: [
      '',
      [Validators.required, trimmedRequired, Validators.maxLength(60), containsLetter],
    ],
    district: [
      '',
      [Validators.required, trimmedRequired, Validators.maxLength(60), containsLetter],
    ],
    address: [
      '',
      [Validators.required, trimmedRequired, Validators.minLength(5), Validators.maxLength(180)],
    ],
    gender: ['', Validators.required],
    relativePhone: [
      '',
      this.copy.variant === 'receive' ? [Validators.required, vietnamesePhone] : [],
    ],
    relativeName: [
      '',
      this.copy.variant === 'receive'
        ? [Validators.required, trimmedRequired, Validators.maxLength(80), fullName]
        : [],
    ],
    donationLocation: [
      '',
      this.copy.variant === 'donate'
        ? [Validators.required, trimmedRequired, Validators.maxLength(120), containsLetter]
        : [],
    ],
    donatedLength: [
      '',
      this.copy.variant === 'donate' ? [Validators.required, donatedHairLength] : [],
    ],
    duration: ['', this.copy.variant === 'receive' ? [Validators.required, expectedDuration] : []],
    hospital: [
      '',
      this.copy.variant === 'receive'
        ? [Validators.required, trimmedRequired, Validators.maxLength(120), containsLetter]
        : [],
    ],
    diagnosis: [
      '',
      this.copy.variant === 'receive'
        ? [Validators.required, trimmedRequired, Validators.maxLength(120), containsLetter]
        : [],
    ],
    borrowDate: ['', this.copy.variant === 'receive' ? [Validators.required, todayOrFuture] : []],
    desiredLength: ['', Validators.maxLength(80)],
    transparency: [
      '',
      this.copy.variant === 'receive'
        ? [Validators.required, trimmedRequired, Validators.minLength(10)]
        : [],
    ],
    commitments: this.formBuilder.nonNullable.array(
      this.donorCommitments.map(() =>
        this.formBuilder.nonNullable.control(
          false,
          this.copy.variant === 'donate' ? Validators.requiredTrue : [],
        ),
      ),
    ),
  });

  protected get commitments(): FormArray {
    return this.form.controls.commitments;
  }

  protected showError(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }

  protected errorMessage(controlName: keyof typeof this.form.controls): string {
    const errors = this.form.controls[controlName].errors;
    if (!errors) return '';

    if (errors['required'] || errors['trimmedRequired']) return 'Vui lòng nhập thông tin này.';
    if (errors['email']) return 'Email chưa đúng định dạng, ví dụ: ten@gmail.com.';
    if (errors['phone']) return 'Số điện thoại Việt Nam phải có 10 số và đúng đầu số.';
    if (errors['personName'])
      return 'Họ tên chỉ được chứa chữ cái, khoảng trắng, dấu nháy hoặc gạch nối.';
    if (errors['fullName']) return 'Vui lòng nhập đầy đủ họ và tên, tối thiểu 2 từ.';
    if (errors['containsLetter']) return 'Thông tin này phải có chữ, không được chỉ nhập số.';
    if (errors['duration']) return 'Nhập thời gian từ 1 đến 12 tháng, ví dụ: 3 tháng.';
    if (errors['pastDate']) return 'Ngày đăng ký không được trước ngày hôm nay.';
    if (errors['hairLength']) return 'Độ dài tóc hiến phải từ 20–80 cm, ví dụ: 25cm.';
    if (errors['minlength']) return 'Thông tin nhập vào còn quá ngắn.';
    if (errors['maxlength']) return 'Thông tin nhập vào vượt quá độ dài cho phép.';
    return 'Thông tin chưa hợp lệ.';
  }

  protected showCommitmentError(index: number): boolean {
    const control = this.commitments.at(index);
    return control.invalid && (control.touched || this.submitted());
  }

  protected submit(): void {
    if (this.isSubmitting()) return;

    this.submitted.set(true);
    this.successMessage.set('');
    this.submitError.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      queueMicrotask(() => {
        document
          .querySelector<HTMLElement>('.hair-form [aria-invalid="true"]')
          ?.focus({ preventScroll: false });
      });
      return;
    }

    this.isSubmitting.set(true);
    this.registrationService
      .submit(this.toRequest())
      .pipe(
        take(1),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: (receipt) => {
          this.successMessage.set(
            `Đăng ký đã được tiếp nhận. Mã đăng ký của bạn là ${receipt.id}.`,
          );
        },
        error: (error: unknown) => {
          this.submitError.set(
            error instanceof HairRegistrationApiError
              ? error.message
              : 'Chưa thể gửi đăng ký. Vui lòng kiểm tra kết nối và thử lại.',
          );
        },
      });
  }

  private toRequest(): HairRegistrationRequest {
    const value = this.form.getRawValue();
    const contact = {
      fullName: value.fullName.trim(),
      phone: value.phone.trim(),
      email: value.email.trim() || undefined,
      province: value.province.trim(),
      district: value.district.trim(),
      address: value.address.trim(),
      gender: value.gender as HairRegistrationGender,
    };

    if (this.copy.variant === 'donate') {
      return {
        ...contact,
        mode: 'donate',
        donationLocation: value.donationLocation.trim(),
        donatedLength: value.donatedLength.trim(),
        acceptedCommitments: this.donorCommitments.filter(
          (_commitment, index) => value.commitments[index],
        ),
      };
    }

    return {
      ...contact,
      mode: 'receive',
      relativePhone: value.relativePhone.trim(),
      relativeName: value.relativeName.trim(),
      duration: value.duration.trim(),
      hospital: value.hospital.trim(),
      diagnosis: value.diagnosis.trim(),
      borrowDate: value.borrowDate,
      desiredLength: value.desiredLength.trim() || undefined,
      transparency: value.transparency.trim(),
    };
  }
}
