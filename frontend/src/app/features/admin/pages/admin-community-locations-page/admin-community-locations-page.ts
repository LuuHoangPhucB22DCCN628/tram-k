import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  type DonationLocationMarker,
  HANOI_DONATION_LOCATIONS,
} from '@features/community/data/hanoi-donation-locations.data';
import { DONATION_MAP_REGIONS } from '@features/community/data/donation-map-regions.data';
import { CommunityLocationAdminStorageService } from '@features/community/services/community-location-admin-storage.service';
import { EscapeCloseDirective } from '@shared/directives/escape-close.directive';

type LocationStatus = DonationLocationMarker['status'];

@Component({
  selector: 'app-admin-community-locations-page',
  standalone: true,
  imports: [ReactiveFormsModule, EscapeCloseDirective],
  templateUrl: './admin-community-locations-page.html',
  styleUrl: './admin-community-locations-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCommunityLocationsPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly storage = inject(CommunityLocationAdminStorageService);
  private readonly baseIds = HANOI_DONATION_LOCATIONS.map((location) => location.id);

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<LocationStatus | 'ALL'>('ALL');
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly feedback = signal('');
  protected readonly locations = computed(() => {
    this.storage.changes();
    const term = this.normalize(this.searchTerm());
    const status = this.statusFilter();
    return this.storage
      .resolve(HANOI_DONATION_LOCATIONS)
      .filter((location) => status === 'ALL' || location.status === status)
      .filter(
        (location) =>
          !term ||
          this.normalize(
            `${location.title} ${location.address} ${location.contactName} ${location.phone} ${this.regionName(location.regionId)}`,
          ).includes(term),
      );
  });

  protected readonly form = this.formBuilder.nonNullable.group({
    regionId: ['ha-noi', Validators.required],
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(160)]],
    description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
    emphasis: ['', Validators.maxLength(200)],
    image: ['', Validators.required],
    schedule: ['', [Validators.required, Validators.maxLength(160)]],
    address: ['', [Validators.required, Validators.maxLength(300)]],
    contactName: ['', [Validators.required, Validators.maxLength(120)]],
    phone: ['', [Validators.required, Validators.maxLength(30)]],
    status: ['ACTIVE' as LocationStatus, Validators.required],
    mapTopPercent: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
    mapLeftPercent: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as LocationStatus | 'ALL');
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      regionId: 'ha-noi',
      title: '',
      description: '',
      emphasis: '',
      image: '/assets/images/community/community-location-tan-trieu.png',
      schedule: '',
      address: '',
      contactName: '',
      phone: 'Đang cập nhật',
      status: 'ACTIVE',
      mapTopPercent: 50,
      mapLeftPercent: 50,
    });
    this.submitted.set(false);
    this.feedback.set('');
    this.editorOpen.set(true);
  }

  protected openEdit(location: DonationLocationMarker): void {
    this.editingId.set(location.id);
    this.form.setValue({
      regionId: location.regionId || 'ha-noi',
      title: location.title,
      description: location.description.join('\n\n'),
      emphasis: location.emphasis ?? '',
      image: location.image,
      schedule: location.schedule,
      address: location.address,
      contactName: location.contactName,
      phone: location.phone,
      status: location.status,
      mapTopPercent: location.mapTopPercent,
      mapLeftPercent: location.mapLeftPercent,
    });
    this.submitted.set(false);
    this.feedback.set('');
    this.editorOpen.set(true);
  }

  protected closeEditor(): void {
    this.editorOpen.set(false);
    this.editingId.set(null);
    this.submitted.set(false);
  }

  protected save(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const editingId = this.editingId();
    const id = editingId ?? `${this.slugify(value.title)}-${Date.now().toString(36)}`;
    this.storage.save(this.baseIds, {
      id,
      regionId: value.regionId,
      label: value.title.trim(),
      title: value.title.trim(),
      description: value.description
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
      emphasis: value.emphasis.trim() || undefined,
      image: value.image.trim(),
      schedule: value.schedule.trim(),
      address: value.address.trim(),
      contactName: value.contactName.trim(),
      phone: value.phone.trim(),
      status: value.status,
      mapTopPercent: value.mapTopPercent,
      mapLeftPercent: value.mapLeftPercent,
    });
    this.feedback.set(editingId ? 'Đã cập nhật điểm tiếp nhận.' : 'Đã tạo điểm tiếp nhận mới.');
    this.closeEditor();
  }

  protected toggleStatus(location: DonationLocationMarker): void {
    const isActive = location.status === 'ACTIVE';
    this.storage.save(this.baseIds, {
      ...location,
      status: isActive ? 'INACTIVE' : 'ACTIVE',
    });
    this.feedback.set(
      isActive
        ? 'Đã tạm ngưng tiếp nhận tại địa điểm này.'
        : 'Địa điểm đã chuyển sang tiếp nhận quyên góp.',
    );
  }

  protected statusLabel(status: LocationStatus): string {
    return status === 'ACTIVE' ? 'Đang tiếp nhận' : 'Tạm ngưng';
  }

  protected regionName(regionId: string): string {
    return DONATION_MAP_REGIONS.find((region) => region.id === regionId)?.name ?? 'Hà Nội';
  }

  protected regionOptions() {
    return DONATION_MAP_REGIONS;
  }

  private slugify(value: string): string {
    return this.normalize(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }
}
