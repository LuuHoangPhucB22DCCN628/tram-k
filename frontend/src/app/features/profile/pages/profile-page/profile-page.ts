import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '@core/auth/auth.service';
import { UiButton } from '@shared/ui';

import type { MemberProfile, ProfileVisibility } from '../../profile.models';
import { ProfileStorageService } from '../../profile-storage.service';

type ProfileFeedback = { readonly type: 'success' | 'error'; readonly message: string };

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, UiButton],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(ProfileStorageService);
  private readonly user = this.auth.currentUser();
  private savedProfile = this.user ? this.storage.read(this.user) : null;

  protected readonly currentYear = new Date().getFullYear();
  protected readonly accountEmail = this.user?.email ?? '';
  protected readonly accountRole = this.roleLabel(this.user?.role);
  protected readonly avatarDataUrl = signal<string | null>(
    this.savedProfile?.avatarDataUrl ?? null,
  );
  protected readonly submitted = signal(false);
  protected readonly feedback = signal<ProfileFeedback | null>(null);
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
      this.savedProfile?.displayName ?? '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(50)],
    ],
    phone: [this.savedProfile?.phone ?? '', [Validators.pattern(/^(?:|0\d{9}|\+84\d{9})$/)]],
    city: [this.savedProfile?.city ?? '', [Validators.maxLength(100)]],
    birthYear: [
      this.savedProfile?.birthYear ?? '',
      [Validators.pattern(/^$|^(?:19\d{2}|20\d{2})$/)],
    ],
    bio: [this.savedProfile?.bio ?? '', [Validators.maxLength(500)]],
    visibility: [this.savedProfile?.visibility ?? ('MEMBERS' as ProfileVisibility)],
    showEmail: [this.savedProfile?.showEmail ?? false],
    allowComments: [this.savedProfile?.allowComments ?? true],
  });

  protected hasError(
    field: 'displayName' | 'phone' | 'city' | 'birthYear' | 'bio',
    errorName: string,
  ): boolean {
    const control = this.profileForm.controls[field];
    return control.hasError(errorName) && (control.touched || this.submitted());
  }

  protected selectAvatar(event: Event): void {
    this.feedback.set(null);
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.feedback.set({ type: 'error', message: 'Avatar chỉ nhận tệp JPG, PNG hoặc WebP.' });
      input.value = '';
      return;
    }

    if (file.size > 1024 * 1024) {
      this.feedback.set({ type: 'error', message: 'Dung lượng avatar không được vượt quá 1 MB.' });
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => this.avatarDataUrl.set(String(reader.result));
    reader.onerror = () =>
      this.feedback.set({ type: 'error', message: 'Không thể đọc ảnh. Vui lòng thử tệp khác.' });
    reader.readAsDataURL(file);
  }

  protected removeAvatar(): void {
    this.avatarDataUrl.set(null);
    this.feedback.set(null);
  }

  protected resetForm(): void {
    if (!this.savedProfile) return;
    this.profileForm.reset(this.savedProfile);
    this.avatarDataUrl.set(this.savedProfile.avatarDataUrl);
    this.submitted.set(false);
    this.feedback.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    this.feedback.set(null);

    if (!this.user || this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const values = this.profileForm.getRawValue();
    const birthYear = values.birthYear ? Number(values.birthYear) : null;
    if (birthYear !== null && birthYear > this.currentYear) {
      this.profileForm.controls.birthYear.setErrors({ futureYear: true });
      return;
    }

    const profile: MemberProfile = {
      ...values,
      displayName: values.displayName.trim(),
      phone: values.phone.trim(),
      city: values.city.trim(),
      birthYear: values.birthYear.trim(),
      bio: values.bio.trim(),
      avatarDataUrl: this.avatarDataUrl(),
    };

    try {
      this.storage.write(this.user.id, profile);
      this.savedProfile = profile;
      this.profileForm.reset(profile);
      this.auth.updateDisplayName(profile.displayName);
      this.submitted.set(false);
      this.feedback.set({ type: 'success', message: 'Đã lưu hồ sơ của bạn.' });
    } catch {
      this.feedback.set({
        type: 'error',
        message: 'Trình duyệt không đủ dung lượng để lưu. Hãy chọn avatar nhỏ hơn.',
      });
    }
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
}
