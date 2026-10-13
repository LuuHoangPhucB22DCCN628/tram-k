import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import {
  donationRegionIdFromName,
  DONATION_MAP_REGIONS,
} from '@features/community/data/donation-map-regions.data';

import type { CharitySupportType } from '../../models/charity-program.models';
import { CharityProgramStorageService } from '../../services/charity-program-storage.service';

type SupportField =
  | 'title'
  | 'supportType'
  | 'description'
  | 'regionId'
  | 'address'
  | 'schedule'
  | 'capacity'
  | 'contactName'
  | 'phone'
  | 'email';

@Component({
  selector: 'app-partner-support-registration-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './partner-support-registration-page.html',
  styleUrl: './partner-support-registration-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerSupportRegistrationPage {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly storage = inject(CharityProgramStorageService);
  private readonly user = this.auth.currentUser();
  private readonly editId = this.route.snapshot.queryParamMap.get('edit');
  private readonly editingProposal =
    this.user && this.editId ? this.storage.proposalFor(this.user.id, this.editId) : null;

  protected readonly submitted = signal(false);
  protected readonly feedback = signal('');
  protected readonly isEditing = this.editingProposal?.status === 'REJECTED';
  protected readonly regions = DONATION_MAP_REGIONS;
  protected readonly form = this.formBuilder.nonNullable.group({
    title: [
      this.editingProposal?.title ?? '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(120)],
    ],
    supportType: [
      this.editingProposal?.supportType ?? ('' as CharitySupportType | ''),
      Validators.required,
    ],
    description: [
      this.editingProposal?.description ?? '',
      [Validators.required, Validators.minLength(30), Validators.maxLength(2000)],
    ],
    regionId: [
      this.editingProposal?.regionId ??
        donationRegionIdFromName(this.editingProposal?.city ?? '') ??
        '',
      Validators.required,
    ],
    address: [
      this.editingProposal?.address ?? '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(250)],
    ],
    schedule: [
      this.editingProposal?.schedule ?? '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(200)],
    ],
    capacity: [
      this.editingProposal?.capacity ?? 1,
      [Validators.required, Validators.min(1), Validators.max(100000)],
    ],
    contactName: [
      this.editingProposal?.contactName ?? this.user?.displayName ?? '',
      [Validators.required, Validators.maxLength(80)],
    ],
    phone: [
      this.editingProposal?.phone ?? '',
      [Validators.required, Validators.pattern(/^(?:0\d{9}|\+84\d{9})$/)],
    ],
    email: [
      this.editingProposal?.email ?? this.user?.email ?? '',
      [Validators.required, Validators.email],
    ],
  });

  protected hasError(field: SupportField): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    this.feedback.set('');
    if (!this.user || this.user.role !== 'PARTNER' || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const region = DONATION_MAP_REGIONS.find((item) => item.id === value.regionId);
    if (!region) return;
    const input = {
      ...value,
      city: region.name,
      supportType: value.supportType as CharitySupportType,
      capacity: Number(value.capacity),
    };
    const proposal = this.isEditing
      ? this.storage.resubmitRejected(this.user.id, this.editingProposal!.id, input)
      : this.storage.create(this.user.id, this.user.displayName, input);
    if (!proposal) {
      this.feedback.set('Không thể cập nhật đề xuất này. Vui lòng tải lại trang.');
      return;
    }
    this.feedback.set(
      this.isEditing
        ? 'Đã cập nhật và gửi lại đề xuất để xét duyệt.'
        : 'Đã gửi đề xuất chương trình để Trạm K xét duyệt.',
    );
    void this.router.navigate(['/doi-tac/quan-ly-chuong-trinh'], {
      queryParams: { created: proposal.id },
    });
  }
}
