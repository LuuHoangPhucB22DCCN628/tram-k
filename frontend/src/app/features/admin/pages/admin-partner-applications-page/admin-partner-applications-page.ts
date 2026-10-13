import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PartnerApplicationStorageService } from '@features/account/services/partner-application-storage.service';
import type { PartnerApplication } from '@features/account/models/partner-application.models';

@Component({
  selector: 'app-admin-partner-applications-page',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './admin-partner-applications-page.html',
  styleUrl: './admin-partner-applications-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPartnerApplicationsPage {
  private readonly storage = inject(PartnerApplicationStorageService);
  protected readonly selectedStatus = signal('PENDING');
  protected readonly rejectionReasons = signal<Record<string, string>>({});
  protected readonly feedback = signal('');
  protected readonly applications = computed(() => {
    const status = this.selectedStatus();
    return this.storage.all().filter((item) => status === 'ALL' || item.status === status);
  });

  constructor() {
    this.storage.initializeAdmin();
  }

  protected setStatus(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value);
  }

  protected updateReason(applicationId: string, reason: string): void {
    this.rejectionReasons.update((values) => ({ ...values, [applicationId]: reason }));
  }

  protected approve(application: PartnerApplication): void {
    this.storage.reviewRemote(application.id, 'APPROVED').subscribe((reviewed) => {
      this.feedback.set(
        reviewed
          ? `Đã duyệt hồ sơ và cấp quyền đối tác cho ${application.applicantName}.`
          : 'Hồ sơ đã thay đổi, vui lòng tải lại trang trước khi duyệt.',
      );
    });
  }

  protected reject(application: PartnerApplication): void {
    const reason = this.rejectionReasons()[application.id] ?? '';
    if (reason.trim().length < 10) {
      this.feedback.set('Lý do từ chối cần có ít nhất 10 ký tự.');
      return;
    }
    this.storage.reviewRemote(application.id, 'REJECTED', reason).subscribe((reviewed) => {
      this.feedback.set(
        reviewed
          ? 'Đã trả hồ sơ để người đăng ký bổ sung.'
          : 'Không thể xử lý hồ sơ. Vui lòng tải lại trang.',
      );
    });
  }

  protected downloadDocument(storageKey: string, originalName: string): void {
    this.storage.downloadDocument(storageKey, originalName);
  }

  protected statusLabel(status: string): string {
    return (
      { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt đối tác', REJECTED: 'Đã từ chối' }[status] ??
      status
    );
  }
}
