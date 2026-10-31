import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { environment } from '@environments/environment';
import { UiModal } from '@shared/ui/ui-modal/ui-modal';
import {
  donationRegionIdFromName,
  DONATION_MAP_REGIONS,
} from '@features/community/data/donation-map-regions.data';

import { charityProgramAddressIsUsable, type CharityEligibleAudience, type CharitySupportType } from '../../models/charity-program.models';
import { programScheduleHasUpcomingOccurrence, programScheduleLabel, validProgramSchedule, vietnamToday, type StructuredProgramSchedule } from '../../models/charity-program-schedule';
import { CharityProgramStorageService } from '../../services/charity-program-storage.service';
import { GooglePlacesLoaderService, type GooglePlaceSelection } from '../../services/google-places-loader.service';

type SupportField =
  | 'title'
  | 'supportType'
  | 'description'
  | 'eligibleAudience'
  | 'eligibilityNote'
  | 'regionId'
  | 'address'
  | 'capacity'
  | 'contactName'
  | 'phone'
  | 'email';

@Component({
  selector: 'app-partner-support-registration-page',
  standalone: true,
  imports: [ReactiveFormsModule, UiModal],
  templateUrl: './partner-support-registration-page.html',
  styleUrl: './partner-support-registration-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerSupportRegistrationPage {
  @ViewChild('googlePlacesHost') private googlePlacesHost?: ElementRef<HTMLDivElement>;
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly storage = inject(CharityProgramStorageService);
  private readonly googlePlaces = inject(GooglePlacesLoaderService);
  private readonly user = this.auth.currentUser();
  private readonly editId = this.route.snapshot.queryParamMap.get('edit');
  private readonly editingProposal =
    this.user && this.editId ? this.storage.proposalFor(this.user.id, this.editId) : null;

  protected readonly submitted = signal(false);
  protected readonly feedback = signal('');
  protected readonly googleMapsAvailable = Boolean(environment.googleMapsApiKey);
  protected readonly googleLoading = signal(false);
  protected readonly googleOpen = signal(false);
  protected readonly googleError = signal('');
  protected readonly googlePlaceId = signal(this.editingProposal?.googlePlaceId ?? '');
  protected readonly addressPickerOpen = signal(false);
  protected readonly addressPickerStep = signal<'REGION' | 'DETAIL'>('REGION');
  protected readonly regionSearch = signal('');
  protected readonly filteredRegions = computed(() => {
    const query = this.normalizeLocation(this.regionSearch());
    return query ? DONATION_MAP_REGIONS.filter((region) => this.normalizeLocation(region.name).includes(query)) : DONATION_MAP_REGIONS;
  });
  private addressBeforePicker?: { regionId: string; address: string; googlePlaceId: string };
  protected readonly today = vietnamToday();
  protected readonly weekdays = [
    { value: 1, label: 'Thứ Hai' }, { value: 2, label: 'Thứ Ba' },
    { value: 3, label: 'Thứ Tư' }, { value: 4, label: 'Thứ Năm' },
    { value: 5, label: 'Thứ Sáu' }, { value: 6, label: 'Thứ Bảy' },
    { value: 7, label: 'Chủ Nhật' },
  ];
  protected readonly selectedWeekdays = signal<readonly number[]>(this.editingProposal?.weekdays ?? []);
  protected readonly scheduleError = signal('');
  protected readonly isEditing = this.editingProposal?.status === 'REJECTED';
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
    eligibleAudience: [
      this.editingProposal?.eligibleAudience ?? ('' as CharityEligibleAudience | ''),
      Validators.required,
    ],
    financialNeedRequired: [this.editingProposal?.financialNeedRequired ?? false],
    eligibilityNote: [
      this.editingProposal?.eligibilityNote ?? '',
      [Validators.maxLength(500)],
    ],
    regionId: [
      this.editingProposal?.regionId ??
        donationRegionIdFromName(this.editingProposal?.city ?? '') ??
        '',
      Validators.required,
    ],
    address: [
      this.editingProposal?.address ?? '',
      [Validators.required, Validators.maxLength(250), (control: AbstractControl) =>
        charityProgramAddressIsUsable(String(control.value ?? '')) ? null : { addressNotSpecific: true }],
    ],
    scheduleType: [this.editingProposal?.scheduleType ?? ('ONE_TIME' as 'ONE_TIME' | 'WEEKLY')],
    startsOn: [this.editingProposal?.startsOn ?? ''],
    endsOn: [this.editingProposal?.endsOn ?? ''],
    startTime: [this.editingProposal?.startTime ?? ''],
    endTime: [this.editingProposal?.endTime ?? ''],
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

  protected toggleWeekday(day: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedWeekdays.update((days) => checked
      ? [...days, day].sort((a, b) => a - b)
      : days.filter((item) => item !== day));
    this.scheduleError.set('');
  }

  protected schedulePreview(): string {
    const schedule = this.structuredSchedule();
    return validProgramSchedule(schedule, this.today) && programScheduleHasUpcomingOccurrence(schedule)
      ? programScheduleLabel(schedule) : '';
  }

  private structuredSchedule(): StructuredProgramSchedule {
    const value = this.form.getRawValue();
    return {
      scheduleType: value.scheduleType,
      startsOn: value.startsOn,
      endsOn: value.scheduleType === 'WEEKLY' ? value.endsOn : undefined,
      startTime: value.startTime,
      endTime: value.endTime,
      weekdays: value.scheduleType === 'WEEKLY' ? this.selectedWeekdays() : undefined,
    };
  }

  protected onAddressTyped(): void {
    this.googlePlaceId.set('');
    this.googleError.set('');
  }

  protected onRegionChanged(): void {
    this.googlePlaceId.set('');
    this.form.controls.address.setValue('');
    this.googleError.set('');
  }

  protected selectedRegionName(): string {
    return DONATION_MAP_REGIONS.find((item) => item.id === this.form.controls.regionId.value)?.name ?? '';
  }

  protected openAddressPicker(): void {
    if (this.addressPickerOpen()) return;
    this.addressBeforePicker = {
      regionId: this.form.controls.regionId.value,
      address: this.form.controls.address.value,
      googlePlaceId: this.googlePlaceId(),
    };
    this.regionSearch.set('');
    this.googleError.set('');
    this.addressPickerStep.set(this.form.controls.regionId.value ? 'DETAIL' : 'REGION');
    this.addressPickerOpen.set(true);
  }

  protected chooseRegion(regionId: string): void {
    if (this.form.controls.regionId.value !== regionId) {
      this.form.controls.regionId.setValue(regionId);
      this.onRegionChanged();
    }
    this.addressPickerStep.set('DETAIL');
  }

  protected showRegionStep(): void {
    this.googleOpen.set(false);
    this.googlePlacesHost?.nativeElement.replaceChildren();
    this.addressPickerStep.set('REGION');
  }

  protected cancelAddressPicker(): void {
    if (this.addressBeforePicker) {
      this.form.patchValue({
        regionId: this.addressBeforePicker.regionId,
        address: this.addressBeforePicker.address,
      });
      this.googlePlaceId.set(this.addressBeforePicker.googlePlaceId);
    }
    this.closeAddressPicker();
  }

  protected confirmAddressPicker(): void {
    this.form.controls.regionId.markAsTouched();
    this.form.controls.address.markAsTouched();
    if (this.form.controls.regionId.invalid) {
      this.addressPickerStep.set('REGION');
      return;
    }
    if (this.form.controls.address.invalid) {
      this.addressPickerStep.set('DETAIL');
      return;
    }
    this.closeAddressPicker();
  }

  private closeAddressPicker(): void {
    this.addressPickerOpen.set(false);
    this.addressBeforePicker = undefined;
    this.googleOpen.set(false);
    this.googleLoading.set(false);
    this.googleError.set('');
    this.googlePlacesHost?.nativeElement.replaceChildren();
  }

  private normalizeLocation(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd');
  }

  protected googleMapsSearchUrl(): string {
    const region = DONATION_MAP_REGIONS.find((item) => item.id === this.form.controls.regionId.value);
    const query = [this.form.controls.address.value.trim(), region?.name, 'Việt Nam'].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  protected async openGoogleAddressSearch(): Promise<void> {
    if (!environment.googleMapsApiKey || this.googleOpen() || this.googleLoading()) return;
    if (!this.form.controls.regionId.value) {
      this.googleError.set('Vui lòng chọn tỉnh/thành phố trước khi tìm địa chỉ.');
      this.form.controls.regionId.markAsTouched();
      return;
    }
    this.googleError.set('');
    this.googleLoading.set(true);
    try {
      const { PlaceAutocompleteElement } = await this.googlePlaces.load(environment.googleMapsApiKey);
      if (!this.addressPickerOpen() || this.addressPickerStep() !== 'DETAIL') return;
      const widget = new PlaceAutocompleteElement();
      widget.includedRegionCodes = ['vn'];
      widget.placeholder = 'Tìm tên cơ sở, đường, số nhà trên Google Maps';
      widget.addEventListener('gmp-select', (event: Event) => {
        const selected = event as Event & { placePrediction?: { toPlace(): GooglePlaceSelection } };
        const place = selected.placePrediction?.toPlace();
        if (place) void this.applyGooglePlace(place);
      });
      this.googlePlacesHost?.nativeElement.replaceChildren(widget);
      this.googleOpen.set(true);
    } catch {
      this.googleError.set('Không tải được gợi ý Google Maps. Bạn vẫn có thể nhập địa chỉ cụ thể bên dưới.');
    } finally {
      this.googleLoading.set(false);
    }
  }

  private async applyGooglePlace(place: GooglePlaceSelection): Promise<void> {
    const selectedRegionId = this.form.controls.regionId.value;
    try {
      await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress'] });
      if (!this.addressPickerOpen() || this.form.controls.regionId.value !== selectedRegionId) return;
      const formatted = place.formattedAddress?.trim() ?? '';
      const name = place.displayName?.trim() ?? '';
      const address = name && !formatted.toLocaleLowerCase('vi').includes(name.toLocaleLowerCase('vi'))
        ? `${name}, ${formatted}` : formatted;
      const region = DONATION_MAP_REGIONS.find((item) => item.id === this.form.controls.regionId.value);
      if (region && !this.normalizeLocation(address).includes(this.normalizeLocation(region.name))) {
        this.googleError.set(`Địa chỉ này không thuộc ${region.name}. Hãy chọn đúng tỉnh/thành phố hoặc địa điểm khác.`);
        return;
      }
      if (address.length > 250 || !charityProgramAddressIsUsable(address)) {
        this.googleError.set('Địa điểm gợi ý chưa có địa chỉ đủ cụ thể. Hãy chọn cơ sở hoặc đường phố rõ hơn.');
        return;
      }
      this.form.controls.address.setValue(address);
      this.form.controls.address.markAsTouched();
      this.googlePlaceId.set(place.id ?? '');
      this.googleError.set('');
    } catch {
      this.googleError.set('Không lấy được địa chỉ từ Google Maps. Vui lòng chọn lại hoặc nhập thủ công.');
    }
  }

  protected submit(): void {
    this.submitted.set(true);
    this.feedback.set('');
    if (!this.user || this.user.role !== 'PARTNER' || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const schedule = this.structuredSchedule();
    if (!validProgramSchedule(schedule, this.today) || !programScheduleHasUpcomingOccurrence(schedule)) {
      this.scheduleError.set('Chọn ngày hợp lệ từ hôm nay, giờ kết thúc sau giờ bắt đầu; lịch hằng tuần cần ngày kết thúc và ít nhất một thứ.');
      return;
    }
    this.scheduleError.set('');

    const value = this.form.getRawValue();
    const region = DONATION_MAP_REGIONS.find((item) => item.id === value.regionId);
    if (!region) return;
    const input = {
      ...value,
      city: region.name,
      supportType: value.supportType as CharitySupportType,
      eligibleAudience: value.eligibleAudience as CharityEligibleAudience,
      eligibilityNote: value.eligibilityNote.trim(),
      address: value.address.trim().replace(/\s+/g, ' '),
      googlePlaceId: this.googlePlaceId() || undefined,
      ...schedule,
      schedule: programScheduleLabel(schedule),
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
