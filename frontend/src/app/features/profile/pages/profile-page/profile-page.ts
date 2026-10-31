import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { UiButton } from '@shared/ui';

import { ProfileApiService } from '../../profile-api.service';
import { ProfileApiError, type MemberProfile, type ProfileVisibility } from '../../profile.models';
import { AvatarImageError, prepareAvatarImage } from './avatar-image';

type ProfileFeedback = { readonly type: 'success' | 'error'; readonly message: string };

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, UiButton],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly profileApi = inject(ProfileApiService);
  private readonly user = this.auth.currentUser();
  private savedProfile: MemberProfile | null = null;

  protected readonly currentYear = new Date().getFullYear();
  protected readonly accountEmail = this.user?.email ?? '';
  protected readonly accountRole = this.roleLabel(this.user?.role);
  protected readonly avatarDataUrl = signal<string | null>(null);
  protected readonly avatarPending = signal(false);
  protected readonly avatarProcessing = signal(false);
  protected readonly avatarFeedback = signal<ProfileFeedback | null>(null);
  protected readonly submitted = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly feedback = signal<ProfileFeedback | null>(null);
  protected readonly showLogoutAllConfirmation = signal(false);
  protected readonly isLoggingOutAll = signal(false);
  protected readonly isRequestingEmailChange = signal(false);
  protected readonly showEmailChangePassword = signal(false);
  protected readonly emailChangeFeedback = signal<ProfileFeedback | null>(null);
  protected initials(): string {
    const name = this.profileForm.controls.displayName.value.trim();
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(-2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'TK'
    );
  }

  protected readonly profileForm = this.formBuilder.nonNullable.group({
    displayName: [
      this.user?.displayName ?? '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(50)],
    ],
    phone: ['', [Validators.pattern(/^(?:|0\d{9}|\+84\d{9})$/)]],
    city: ['', [Validators.maxLength(100)]],
    birthYear: ['', [Validators.pattern(/^$|^(?:19\d{2}|20\d{2})$/)]],
    bio: ['', [Validators.maxLength(500)]],
    visibility: ['MEMBERS' as ProfileVisibility],
    showEmail: [false],
    allowComments: [true],
  });

  protected readonly emailChangeForm = this.formBuilder.nonNullable.group({
    newEmail: ['', [Validators.required, Validators.email]],
    currentPassword: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  protected hasError(
    field: 'displayName' | 'phone' | 'city' | 'birthYear' | 'bio',
    errorName: string,
  ): boolean {
    const control = this.profileForm.controls[field];
    return control.hasError(errorName) && (control.touched || this.submitted());
  }

  protected async selectAvatar(event: Event): Promise<void> {
    this.avatarFeedback.set(null);
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.avatarProcessing.set(true);
    this.avatarFeedback.set({ type: 'success', message: 'Đang xử lý ảnh...' });
    try {
      const dataUrl = await prepareAvatarImage(file);
      this.avatarDataUrl.set(dataUrl);
      this.avatarPending.set(true);
      this.avatarFeedback.set({
        type: 'success',
        message: 'Ảnh đã chọn nhưng chưa lưu. Bấm “Lưu ảnh” để hoàn tất.',
      });
    } catch (error) {
      this.avatarFeedback.set({
        type: 'error',
        message:
          error instanceof AvatarImageError
            ? error.message
            : 'Không thể xử lý ảnh. Vui lòng thử lại.',
      });
    } finally {
      this.avatarProcessing.set(false);
      input.value = '';
    }
  }

  protected removeAvatar(): void {
    this.avatarDataUrl.set(null);
    this.avatarPending.set(this.savedProfile?.avatarDataUrl != null);
    this.avatarFeedback.set(
      this.avatarPending()
        ? { type: 'success', message: 'Ảnh sẽ được xóa sau khi bạn bấm “Lưu ảnh”.' }
        : null,
    );
  }

  protected resetForm(): void {
    if (!this.savedProfile) return;
    this.profileForm.reset(this.savedProfile);
    this.avatarDataUrl.set(this.savedProfile.avatarDataUrl);
    this.avatarPending.set(false);
    this.avatarFeedback.set(null);
    this.submitted.set(false);
    this.feedback.set(null);
  }

  protected save(): void {
    if (this.avatarProcessing() || this.isSaving()) return;
    this.submitted.set(true);
    this.feedback.set(null);

    if (!this.user || this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      if (this.avatarPending()) {
        this.avatarFeedback.set({
          type: 'error',
          message: 'Vui lòng sửa các thông tin chưa hợp lệ trước khi lưu ảnh.',
        });
      }
      return;
    }

    const values = this.profileForm.getRawValue();
    const birthYear = values.birthYear ? Number(values.birthYear) : null;
    if (birthYear !== null && birthYear > this.currentYear) {
      this.profileForm.controls.birthYear.setErrors({ futureYear: true });
      if (this.avatarPending()) {
        this.avatarFeedback.set({
          type: 'error',
          message: 'Vui lòng sửa năm sinh trước khi lưu ảnh.',
        });
      }
      return;
    }

    const profile: MemberProfile = {
      version: this.savedProfile?.version ?? 1,
      ...values,
      displayName: values.displayName.trim(),
      phone: values.phone.trim(),
      city: values.city.trim(),
      birthYear: values.birthYear.trim(),
      bio: values.bio.trim(),
      avatarDataUrl: this.avatarDataUrl(),
      showEmail: false,
    };

    this.isSaving.set(true);
    const avatarWasPending = this.avatarPending();
    this.profileApi.updateOwnProfile(this.user, this.auth.authMode(), profile).subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        this.applyProfile(saved);
        if (avatarWasPending) {
          this.avatarFeedback.set({ type: 'success', message: 'Đã lưu ảnh đại diện.' });
        }
        this.submitted.set(false);
        this.feedback.set({ type: 'success', message: 'Đã lưu hồ sơ của bạn.' });
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        if (error instanceof ProfileApiError && error.code === 'CONFLICT') {
          this.loadProfile('Hồ sơ đã thay đổi ở nơi khác. Dữ liệu mới nhất đã được tải lại.');
          return;
        }
        const result: ProfileFeedback = {
          type: 'error',
          message:
            error instanceof ProfileApiError
              ? error.message
              : 'Không thể lưu hồ sơ. Vui lòng thử lại.',
        };
        this.feedback.set(result);
        if (avatarWasPending) this.avatarFeedback.set(result);
      },
    });
  }

  protected logoutAllDevices(): void {
    if (this.isLoggingOutAll()) return;
    this.isLoggingOutAll.set(true);
    this.feedback.set(null);
    this.auth.logoutAll().subscribe({
      next: () => void this.router.navigate(['/dang-nhap']),
      error: () => {
        this.isLoggingOutAll.set(false);
        this.feedback.set({
          type: 'error',
          message: 'Không thể đăng xuất mọi thiết bị. Vui lòng thử lại.',
        });
      },
    });
  }

  protected requestEmailChange(): void {
    if (this.isRequestingEmailChange()) return;
    this.emailChangeFeedback.set(null);
    if (this.emailChangeForm.invalid) {
      this.emailChangeForm.markAllAsTouched();
      return;
    }

    const value = this.emailChangeForm.getRawValue();
    this.isRequestingEmailChange.set(true);
    this.auth.requestEmailChange(value.newEmail.trim(), value.currentPassword).subscribe({
      next: ({ pendingEmail }) => {
        this.isRequestingEmailChange.set(false);
        this.emailChangeForm.reset({ newEmail: pendingEmail, currentPassword: '' });
        this.showEmailChangePassword.set(false);
        this.emailChangeFeedback.set({
          type: 'success',
          message: `Đã gửi liên kết xác minh đến ${pendingEmail}. Email hiện tại vẫn được giữ cho đến khi bạn xác minh.`,
        });
      },
      error: (error: unknown) => {
        this.isRequestingEmailChange.set(false);
        this.emailChangeFeedback.set({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Không thể gửi yêu cầu đổi email. Vui lòng thử lại.',
        });
      },
    });
  }

  private roleLabel(role: string | undefined): string {
    const labels: Record<string, string> = {
      PATIENT: 'Bệnh nhân / Thành viên',
      CARER: 'Người chăm sóc',
      PARTNER: 'Đối tác hỗ trợ',
      ADMIN: 'Quản trị viên',
    };
    return role ? (labels[role] ?? role) : '';
  }

  private loadProfile(conflictMessage?: string): void {
    if (!this.user) {
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    this.profileApi.getOwnProfile(this.user, this.auth.authMode()).subscribe({
      next: (profile) => {
        this.isLoading.set(false);
        this.applyProfile(profile);
        if (conflictMessage) this.feedback.set({ type: 'error', message: conflictMessage });
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.feedback.set({
          type: 'error',
          message:
            error instanceof ProfileApiError
              ? error.message
              : 'Không thể tải hồ sơ. Vui lòng thử lại.',
        });
      },
    });
  }

  private applyProfile(profile: MemberProfile): void {
    this.savedProfile = profile;
    this.profileForm.reset({ ...profile, showEmail: false });
    this.avatarDataUrl.set(profile.avatarDataUrl);
    this.avatarPending.set(false);
    this.avatarFeedback.set(null);
    this.auth.updateProfileSummary(profile.displayName, profile.avatarDataUrl);
  }
}
