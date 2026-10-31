import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { charityEligibilityLabel, charityProgramAddressIsUsable, type
  CharityProgramProposal,
  CharitySupportType,
  CharityEligibleAudience,
  CharityScheduleType,
} from '@features/account/models/charity-program.models';
import { CharityProgramStorageService } from '@features/account/services/charity-program-storage.service';
import {
  programDisplayStatus,
  programDisplayStatusLabel,
  programScheduleHasUpcomingOccurrence,
  programStructuredSchedule,
  programScheduleLabel,
  validProgramSchedule,
  vietnamToday,
  type CharityProgramDisplayStatus,
  type StructuredProgramSchedule,
} from '@features/account/models/charity-program-schedule';
import { CharityProgramClockService } from '@features/account/services/charity-program-clock.service';
import { EscapeCloseDirective } from '@shared/directives/escape-close.directive';

type ProgramFilter = CharityProgramDisplayStatus | 'ALL';

@Component({
  selector: 'app-admin-charity-programs-page',
  standalone: true,
  imports: [DatePipe, EscapeCloseDirective],
  templateUrl: './admin-charity-programs-page.html',
  styleUrl: './admin-charity-programs-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCharityProgramsPage {
  private readonly storage = inject(CharityProgramStorageService);
  private readonly clock = inject(CharityProgramClockService);
  protected readonly eligibilityLabel = charityEligibilityLabel;
  protected readonly statusLabel = programDisplayStatusLabel;

  protected readonly statusFilter = signal<ProgramFilter>('ALL');
  protected readonly selected = signal<CharityProgramProposal | null>(null);
  protected readonly rejecting = signal<CharityProgramProposal | null>(null);
  protected readonly deleting = signal<CharityProgramProposal | null>(null);
  protected readonly deleteBusy = signal(false);
  protected readonly reviewBusy = signal(false);
  protected readonly rejectionReason = signal('');
  protected readonly feedback = signal('');
  protected readonly eligibleAudience = signal<CharityEligibleAudience | ''>('');
  protected readonly financialNeedRequired = signal(false);
  protected readonly eligibilityNote = signal('');
  protected readonly editingAddress = signal('');
  protected readonly editingSchedule = signal('');
  protected readonly repairType = signal<CharityScheduleType>('ONE_TIME');
  protected readonly repairStartsOn = signal('');
  protected readonly repairEndsOn = signal('');
  protected readonly repairStartTime = signal('');
  protected readonly repairEndTime = signal('');
  protected readonly repairWeekdays = signal<readonly number[]>([]);
  protected readonly weekdays = [
    { value: 1, label: 'T2' }, { value: 2, label: 'T3' }, { value: 3, label: 'T4' },
    { value: 4, label: 'T5' }, { value: 5, label: 'T6' }, { value: 6, label: 'T7' },
    { value: 7, label: 'CN' },
  ];
  protected readonly today = vietnamToday();
  protected readonly savingPublished = signal(false);
  protected readonly detailFeedback = signal('');
  protected readonly addressIsUsable = computed(() => charityProgramAddressIsUsable(this.editingAddress()));
  protected readonly repairSchedule = computed<StructuredProgramSchedule>(() => ({
    scheduleType: this.repairType(),
    startsOn: this.repairStartsOn(),
    endsOn: this.repairType() === 'WEEKLY' ? this.repairEndsOn() : undefined,
    startTime: this.repairStartTime(),
    endTime: this.repairEndTime(),
    weekdays: this.repairType() === 'WEEKLY' ? this.repairWeekdays() : undefined,
  }));
  protected readonly scheduleIsUsable = computed(() => {
    const selected = this.selected();
    if (selected && programDisplayStatus(selected, this.clock.now()) === 'PUBLISHED') return true;
    const schedule = this.repairSchedule();
    return validProgramSchedule(schedule) && programScheduleHasUpcomingOccurrence(schedule, this.clock.now());
  });
  protected readonly proposals = computed(() => {
    const filter = this.statusFilter();
    const now = this.clock.now();
    const proposals = this.storage.all();
    return filter === 'ALL' ? proposals : proposals.filter((item) => programDisplayStatus(item, now) === filter);
  });

  protected programStatus(proposal: CharityProgramProposal): CharityProgramDisplayStatus {
    return programDisplayStatus(proposal, this.clock.now());
  }

  constructor() {
    this.storage.initializeAdmin();
  }

  protected changeFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as ProgramFilter);
  }

  protected openDetails(proposal: CharityProgramProposal): void {
    this.selected.set(proposal);
    this.detailFeedback.set('');
    this.editingAddress.set(proposal.address);
    this.editingSchedule.set(proposal.schedule);
    const suggestedWeekdays = proposal.weekdays ?? this.weekdaysFromLegacyText(proposal.schedule);
    this.repairType.set(proposal.scheduleType ?? (suggestedWeekdays.length ? 'WEEKLY' : 'ONE_TIME'));
    this.repairStartsOn.set(proposal.startsOn ?? '');
    this.repairEndsOn.set(proposal.endsOn ?? '');
    this.repairStartTime.set(proposal.startTime ?? '');
    this.repairEndTime.set(proposal.endTime ?? '');
    this.repairWeekdays.set(suggestedWeekdays);
    this.eligibleAudience.set(proposal.eligibleAudience ?? '');
    this.financialNeedRequired.set(proposal.financialNeedRequired ?? false);
    this.eligibilityNote.set(proposal.eligibilityNote ?? '');
  }

  protected closeDetails(): void {
    if (this.savingPublished() || this.reviewBusy()) return;
    this.selected.set(null);
  }

  protected async approve(proposal: CharityProgramProposal): Promise<void> {
    if (this.reviewBusy()) return;
    if (!charityProgramAddressIsUsable(proposal.address)) {
      this.detailFeedback.set('Địa chỉ chưa đủ rõ để công khai. Hãy yêu cầu đối tác chỉnh sửa trước khi duyệt.');
      return;
    }
    const schedule = programStructuredSchedule(proposal);
    if (!schedule || !programScheduleHasUpcomingOccurrence(schedule)) {
      this.detailFeedback.set('Lịch chưa có ngày giờ cụ thể hoặc đã hết hạn. Hãy yêu cầu đối tác cập nhật trước khi duyệt.');
      return;
    }
    if (!this.eligibleAudience()) {
      this.feedback.set('Vui lòng chọn đối tượng nhận hỗ trợ trước khi duyệt.');
      return;
    }
    this.reviewBusy.set(true);
    try {
      const reviewed = await this.storage.review(proposal.id, 'PUBLISHED', '', {
        eligibleAudience: this.eligibleAudience() as CharityEligibleAudience,
        financialNeedRequired: this.financialNeedRequired(),
        eligibilityNote: this.eligibilityNote(),
      });
      this.feedback.set(reviewed ? 'Đã xuất bản chương trình.' : 'Chưa duyệt được trên máy chủ. Vui lòng thử lại.');
      if (reviewed && this.selected()?.id === proposal.id) this.closeDetails();
    } finally {
      this.reviewBusy.set(false);
    }
  }

  protected updateAudience(event: Event): void {
    this.eligibleAudience.set((event.target as HTMLSelectElement).value as CharityEligibleAudience | '');
  }

  protected updateFinancialNeed(event: Event): void {
    this.financialNeedRequired.set((event.target as HTMLInputElement).checked);
  }

  protected updateEligibilityNote(event: Event): void {
    this.eligibilityNote.set((event.target as HTMLTextAreaElement).value);
  }

  protected updateAddress(event: Event): void {
    this.editingAddress.set((event.target as HTMLInputElement).value);
    this.detailFeedback.set('');
  }

  protected updateRepairField(field: 'startsOn' | 'endsOn' | 'startTime' | 'endTime', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    ({ startsOn: this.repairStartsOn, endsOn: this.repairEndsOn,
      startTime: this.repairStartTime, endTime: this.repairEndTime })[field].set(value);
    this.detailFeedback.set('');
  }

  protected updateRepairType(event: Event): void {
    this.repairType.set((event.target as HTMLSelectElement).value as CharityScheduleType);
    this.detailFeedback.set('');
  }

  protected toggleRepairWeekday(day: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.repairWeekdays.update((days) => checked ? [...days, day] : days.filter((item) => item !== day));
    this.detailFeedback.set('');
  }

  protected async savePublished(proposal: CharityProgramProposal): Promise<void> {
    if (this.savingPublished() || !this.addressIsUsable() || !this.scheduleIsUsable()) return;
    const structuredSchedule = this.programStatus(proposal) === 'PUBLISHED'
      ? undefined : this.repairSchedule();
    this.savingPublished.set(true);
    try {
      const updated = await this.storage.updatePublishedDetails(proposal.id, {
        address: this.editingAddress(),
        schedule: structuredSchedule ? programScheduleLabel(structuredSchedule) : this.editingSchedule(),
        structuredSchedule,
        eligibleAudience: this.eligibleAudience() || undefined,
        financialNeedRequired: this.financialNeedRequired(),
        eligibilityNote: this.eligibilityNote(),
      });
      if (updated) {
        this.selected.set(updated);
        this.detailFeedback.set('Đã lưu thay đổi lên máy chủ. Địa chỉ mới sẽ được chat dùng để gợi ý.');
      } else {
        this.detailFeedback.set('Chưa lưu được lên máy chủ. Vui lòng kiểm tra kết nối và thử lại.');
      }
    } catch {
      this.detailFeedback.set('Chưa lưu được lên máy chủ. Vui lòng thử lại.');
    } finally {
      this.savingPublished.set(false);
    }
  }

  protected openReject(proposal: CharityProgramProposal): void {
    this.rejecting.set(proposal);
    this.rejectionReason.set('');
  }

  protected closeReject(): void {
    if (this.reviewBusy()) return;
    this.rejecting.set(null);
    this.rejectionReason.set('');
  }

  protected openDelete(proposal: CharityProgramProposal): void {
    this.deleting.set(proposal);
  }

  protected closeDelete(): void {
    if (!this.deleteBusy()) this.deleting.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const proposal = this.deleting();
    if (!proposal || this.deleteBusy()) return;
    this.deleteBusy.set(true);
    try {
      const deletedRegistrations = await this.storage.deleteByAdmin(proposal.id);
      if (deletedRegistrations === null) {
        this.feedback.set('Chưa xóa được chương trình trên máy chủ. Vui lòng thử lại.');
        return;
      }
      if (this.selected()?.id === proposal.id) this.selected.set(null);
      this.feedback.set(`Đã xóa chương trình “${proposal.title}”${deletedRegistrations
        ? ` và ${deletedRegistrations} hồ sơ đăng ký liên quan` : ''}.`);
      this.deleting.set(null);
    } finally {
      this.deleteBusy.set(false);
    }
  }

  protected updateReason(event: Event): void {
    this.rejectionReason.set((event.target as HTMLTextAreaElement).value);
  }

  protected async reject(): Promise<void> {
    const proposal = this.rejecting();
    if (!proposal || this.reviewBusy() || this.rejectionReason().trim().length < 10) return;
    this.reviewBusy.set(true);
    try {
      const reviewed = await this.storage.review(proposal.id, 'REJECTED', this.rejectionReason());
      this.feedback.set(reviewed ? 'Đã gửi yêu cầu chỉnh sửa.' : 'Chưa lưu được quyết định trên máy chủ. Vui lòng thử lại.');
      if (reviewed) this.closeReject();
    } finally {
      this.reviewBusy.set(false);
    }
  }

  protected supportTypeLabel(type: CharitySupportType): string {
    return {
      MEAL: 'Suất ăn',
      FINANCIAL: 'Hỗ trợ chi phí',
      TRANSPORT: 'Hỗ trợ di chuyển',
      OTHER: 'Hình thức khác',
    }[type];
  }

  private weekdaysFromLegacyText(value: string): number[] {
    const text = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const names: Record<string, number> = {
      hai: 1, ba: 2, tu: 3, nam: 4, sau: 5, bay: 6,
    };
    const days = [...text.matchAll(/\bthu\s+(hai|ba|tu|nam|sau|bay)\b|\bchu\s+nhat\b/g)]
      .map((match) => match[1] ? names[match[1]] : 7);
    return [...new Set(days)];
  }
}
