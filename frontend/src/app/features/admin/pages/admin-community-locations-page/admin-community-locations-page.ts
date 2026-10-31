import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CommunityLocationPin } from '@features/community/components/community-location-pin/community-location-pin';
import {
  type DonationLocationMarker,
  HANOI_DONATION_LOCATIONS,
} from '@features/community/data/hanoi-donation-locations.data';
import { DONATION_MAP_REGIONS } from '@features/community/data/donation-map-regions.data';
import { recurringLocationScheduleLabel, validRecurringLocationSchedule } from
  '@features/community/data/donation-location-schedule';
import { donationMapImageForRegion } from '@features/community/data/donation-location-map.utils';
import { CommunityLocationAdminStorageService } from '@features/community/services/community-location-admin-storage.service';
import { EscapeCloseDirective } from '@shared/directives/escape-close.directive';

type LocationStatus = DonationLocationMarker['status'];

const LOCATION_FIELD_LABELS = {
  regionId: 'Tỉnh/thành',
  title: 'Tên điểm tiếp nhận',
  weekdays: 'Thứ trong tuần',
  startTime: 'Giờ bắt đầu',
  endTime: 'Giờ kết thúc',
  status: 'Trạng thái',
  contactName: 'Đơn vị liên hệ',
  phone: 'Số điện thoại',
  address: 'Địa chỉ',
  image: 'Đường dẫn ảnh',
  mapTopPercent: 'Vị trí dọc trên bản đồ',
  mapLeftPercent: 'Vị trí ngang trên bản đồ',
  latitude: 'Vĩ độ GPS',
  longitude: 'Kinh độ GPS',
  description: 'Mô tả',
  emphasis: 'Thông điệp nhấn mạnh',
} as const;

type LocationField = keyof typeof LOCATION_FIELD_LABELS;

@Component({
  selector: 'app-admin-community-locations-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommunityLocationPin, EscapeCloseDirective],
  templateUrl: './admin-community-locations-page.html',
  styleUrl: './admin-community-locations-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCommunityLocationsPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly storage = inject(CommunityLocationAdminStorageService);
  private readonly editorForm = viewChild<ElementRef<HTMLFormElement>>('editorForm');

  protected readonly adminReady = this.storage.adminReady;
  protected readonly loadError = this.storage.loadError;
  protected readonly saving = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<LocationStatus | 'ALL'>('ALL');
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly feedback = signal('');
  protected readonly weekdays = [
    { value: 1, label: 'Thứ Hai' }, { value: 2, label: 'Thứ Ba' },
    { value: 3, label: 'Thứ Tư' }, { value: 4, label: 'Thứ Năm' },
    { value: 5, label: 'Thứ Sáu' }, { value: 6, label: 'Thứ Bảy' },
    { value: 7, label: 'Chủ Nhật' },
  ];
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
    weekdays: [[] as number[], Validators.required],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    address: ['', [Validators.required, Validators.maxLength(300)]],
    contactName: ['', [Validators.required, Validators.maxLength(120)]],
    phone: ['', [Validators.required, Validators.maxLength(30)]],
    status: ['ACTIVE' as LocationStatus, Validators.required],
    mapTopPercent: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
    mapLeftPercent: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
    latitude: [
      null as number | null,
      [Validators.required, Validators.min(-90), Validators.max(90)],
    ],
    longitude: [
      null as number | null,
      [Validators.required, Validators.min(-180), Validators.max(180)],
    ],
  });

  constructor() {
    this.storage.initializeAdmin();
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as LocationStatus | 'ALL');
  }

  protected retryLoad(): void {
    this.storage.initializeAdmin();
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      regionId: 'ha-noi',
      title: '',
      description: '',
      emphasis: '',
      image: '/assets/images/community/community-location-tan-trieu.png',
      weekdays: [],
      startTime: '',
      endTime: '',
      address: '',
      contactName: '',
      phone: 'Đang cập nhật',
      status: 'ACTIVE',
      mapTopPercent: 50,
      mapLeftPercent: 50,
      latitude: null,
      longitude: null,
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
      weekdays: [...(location.weekdays ?? [])],
      startTime: location.startTime ?? '',
      endTime: location.endTime ?? '',
      address: location.address,
      contactName: location.contactName,
      phone: location.phone,
      status: location.status,
      mapTopPercent: location.mapTopPercent,
      mapLeftPercent: location.mapLeftPercent,
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
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

  protected toggleWeekday(day: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.form.controls.weekdays.value;
    this.form.controls.weekdays.setValue(checked
      ? [...current, day] : current.filter((value) => value !== day));
    this.form.controls.weekdays.markAsTouched();
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.feedback.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.adminReady()) {
      this.feedback.set('Chưa kết nối được máy chủ. Vui lòng thử lại sau.');
      return;
    }

    const value = this.form.getRawValue();
    if (!validRecurringLocationSchedule(value)) {
      this.feedback.set('Lịch chưa hợp lệ: chọn ít nhất một thứ và giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }
    const editingId = this.editingId();
    const id = editingId ?? `${this.slugify(value.title)}-${Date.now().toString(36)}`;
    this.saving.set(true);
    const saved = await this.storage.saveRemote({
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
      schedule: recurringLocationScheduleLabel(value),
      weekdays: value.weekdays,
      startTime: value.startTime,
      endTime: value.endTime,
      address: value.address.trim(),
      contactName: value.contactName.trim(),
      phone: value.phone.trim(),
      status: value.status,
      mapTopPercent: value.mapTopPercent,
      mapLeftPercent: value.mapLeftPercent,
      latitude: value.latitude!,
      longitude: value.longitude!,
    });
    this.saving.set(false);
    if (!saved) {
      this.feedback.set('Không thể lưu điểm tiếp nhận lên máy chủ. Vui lòng thử lại.');
      return;
    }
    this.feedback.set(editingId ? 'Đã cập nhật điểm tiếp nhận.' : 'Đã tạo điểm tiếp nhận mới.');
    this.closeEditor();
  }

  protected async toggleStatus(location: DonationLocationMarker): Promise<void> {
    if (!this.adminReady() || this.saving()) return;
    if (!this.hasGpsCoordinates(location)) {
      this.feedback.set(
        'Điểm tiếp nhận này chưa điền GPS. Hãy chỉnh sửa và bổ sung vĩ độ, kinh độ trước khi đổi trạng thái.',
      );
      return;
    }
    const isActive = location.status === 'ACTIVE';
    this.saving.set(true);
    const saved = await this.storage.saveRemote({
      ...location,
      status: isActive ? 'INACTIVE' : 'ACTIVE',
    });
    this.saving.set(false);
    if (!saved) {
      this.feedback.set('Không thể cập nhật trạng thái trên máy chủ. Vui lòng thử lại.');
      return;
    }
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

  protected mapPreviewImage(): string {
    return donationMapImageForRegion(this.form.controls.regionId.value);
  }

  protected hasGpsCoordinates(location: DonationLocationMarker): boolean {
    return (
      typeof location.latitude === 'number' &&
      Number.isFinite(location.latitude) &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      typeof location.longitude === 'number' &&
      Number.isFinite(location.longitude) &&
      location.longitude >= -180 &&
      location.longitude <= 180
    );
  }

  protected fieldError(field: LocationField): string | null {
    const control = this.form.controls[field];
    if (!(this.submitted() || control.touched) || control.valid) return null;
    const label = LOCATION_FIELD_LABELS[field];
    if (control.hasError('required')) {
      if (field === 'latitude' || field === 'longitude') {
        return `Chưa điền ${field === 'latitude' ? 'vĩ độ' : 'kinh độ'} GPS.`;
      }
      return field === 'regionId' || field === 'status'
        ? `Vui lòng chọn ${label.toLowerCase()}.`
        : `Vui lòng nhập ${label.toLowerCase()}.`;
    }
    if (control.hasError('minlength')) {
      const { requiredLength, actualLength } = control.getError('minlength') as {
        requiredLength: number;
        actualLength: number;
      };
      return `${label} cần ít nhất ${requiredLength} ký tự (hiện có ${actualLength}).`;
    }
    if (control.hasError('maxlength')) {
      const { requiredLength } = control.getError('maxlength') as { requiredLength: number };
      return `${label} không được quá ${requiredLength} ký tự.`;
    }
    if (control.hasError('min') || control.hasError('max')) {
      if (field === 'latitude' || field === 'longitude') {
        return `${label} phải từ ${field === 'latitude' ? '-90 đến 90' : '-180 đến 180'}.`;
      }
      return `${label} phải từ 0 đến 100%.`;
    }
    return `${label} chưa hợp lệ.`;
  }

  protected validationErrors(): { field: LocationField; message: string }[] {
    if (!this.submitted()) return [];
    return (Object.keys(LOCATION_FIELD_LABELS) as LocationField[]).flatMap((field) => {
      const message = this.fieldError(field);
      return message ? [{ field, message }] : [];
    });
  }

  protected focusField(field: LocationField): void {
    const selector = field === 'weekdays'
      ? '.location-editor__weekdays input[type="checkbox"]'
      : `[formcontrolname="${field}"]`;
    this.editorForm()?.nativeElement.querySelector<HTMLElement>(selector)?.focus();
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
