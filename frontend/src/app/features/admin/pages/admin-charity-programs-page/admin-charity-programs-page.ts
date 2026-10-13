import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import type {
  CharityProgramProposal,
  CharityProgramStatus,
  CharitySupportType,
} from '@features/account/models/charity-program.models';
import { CharityProgramStorageService } from '@features/account/services/charity-program-storage.service';
import { EscapeCloseDirective } from '@shared/directives/escape-close.directive';

type ProgramFilter = CharityProgramStatus | 'ALL';

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

  protected readonly statusFilter = signal<ProgramFilter>('ALL');
  protected readonly selected = signal<CharityProgramProposal | null>(null);
  protected readonly rejecting = signal<CharityProgramProposal | null>(null);
  protected readonly rejectionReason = signal('');
  protected readonly feedback = signal('');
  protected readonly proposals = computed(() => {
    const filter = this.statusFilter();
    const proposals = this.storage.all();
    return filter === 'ALL' ? proposals : proposals.filter((item) => item.status === filter);
  });

  constructor() {
    this.storage.initializeAdmin();
  }

  protected changeFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as ProgramFilter);
  }

  protected openDetails(proposal: CharityProgramProposal): void {
    this.selected.set(proposal);
  }

  protected closeDetails(): void {
    this.selected.set(null);
  }

  protected approve(proposal: CharityProgramProposal): void {
    const reviewed = this.storage.review(proposal.id, 'PUBLISHED');
    this.feedback.set(reviewed ? 'Đã xuất bản chương trình.' : 'Chương trình không còn chờ duyệt.');
    if (this.selected()?.id === proposal.id) this.closeDetails();
  }

  protected openReject(proposal: CharityProgramProposal): void {
    this.rejecting.set(proposal);
    this.rejectionReason.set('');
  }

  protected closeReject(): void {
    this.rejecting.set(null);
    this.rejectionReason.set('');
  }

  protected updateReason(event: Event): void {
    this.rejectionReason.set((event.target as HTMLTextAreaElement).value);
  }

  protected reject(): void {
    const proposal = this.rejecting();
    if (!proposal || this.rejectionReason().trim().length < 10) return;
    const reviewed = this.storage.review(proposal.id, 'REJECTED', this.rejectionReason());
    this.feedback.set(reviewed ? 'Đã gửi yêu cầu chỉnh sửa.' : 'Không thể từ chối đề xuất này.');
    if (reviewed) this.closeReject();
  }

  protected statusLabel(status: CharityProgramStatus): string {
    return {
      PENDING: 'Chờ duyệt',
      PUBLISHED: 'Đã xuất bản',
      REJECTED: 'Cần chỉnh sửa',
    }[status];
  }

  protected supportTypeLabel(type: CharitySupportType): string {
    return {
      MEAL: 'Suất ăn',
      FINANCIAL: 'Hỗ trợ chi phí',
      TRANSPORT: 'Hỗ trợ di chuyển',
      OTHER: 'Hình thức khác',
    }[type];
  }
}
