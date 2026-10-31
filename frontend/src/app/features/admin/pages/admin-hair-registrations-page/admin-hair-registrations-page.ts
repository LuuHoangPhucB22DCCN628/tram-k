import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  AdminHairRegistrationsApiService,
  type HairMode,
  type HairRegistrationDetail,
  type HairRegistrationList,
  type HairStatus,
} from '../../services/admin-hair-registrations-api.service';

@Component({
  selector: 'app-admin-hair-registrations-page',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-hair-registrations-page.html',
  styleUrl: './admin-hair-registrations-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHairRegistrationsPage {
  private readonly api = inject(AdminHairRegistrationsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private requestId = 0;
  private detailRequestId = 0;

  protected readonly mode = signal<HairMode | 'ALL'>('ALL');
  protected readonly status = signal<HairStatus | 'ALL'>('ALL');
  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly result = signal<HairRegistrationList | null>(null);
  protected readonly selected = signal<HairRegistrationDetail | null>(null);
  protected readonly loading = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly actionBusy = signal(false);
  protected readonly rejectionReason = signal('');
  protected readonly feedback = signal('');
  protected readonly error = signal('');
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil((this.result()?.total ?? 0) / (this.result()?.limit ?? 20))),
  );

  constructor() {
    this.load();
  }

  protected setMode(event: Event): void {
    this.mode.set((event.target as HTMLSelectElement).value as HairMode | 'ALL');
    this.page.set(1);
    this.load();
  }

  protected setStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as HairStatus | 'ALL');
    this.page.set(1);
    this.load();
  }

  protected setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected submitSearch(event: Event): void {
    event.preventDefault();
    this.page.set(1);
    this.load();
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.load();
  }

  protected reload(): void {
    this.load();
    const selected = this.selected();
    if (selected) this.openDetail(selected.id);
  }

  protected openDetail(id: string): void {
    const requestId = ++this.detailRequestId;
    this.detailLoading.set(true);
    this.error.set('');
    this.api
      .detail(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          if (requestId !== this.detailRequestId) return;
          this.selected.set(detail);
          this.rejectionReason.set('');
          this.detailLoading.set(false);
        },
        error: (error: unknown) => {
          if (requestId !== this.detailRequestId) return;
          this.error.set(this.errorMessage(error));
          this.detailLoading.set(false);
        },
      });
  }

  protected closeDetail(): void {
    this.detailRequestId++;
    this.selected.set(null);
    this.detailLoading.set(false);
    this.rejectionReason.set('');
  }

  protected updateReason(event: Event): void {
    this.rejectionReason.set((event.target as HTMLTextAreaElement).value);
  }

  protected review(status: Exclude<HairStatus, 'PENDING'>): void {
    const detail = this.selected();
    if (!detail || this.actionBusy()) return;
    const reason = this.rejectionReason().trim();
    if (status === 'REJECTED' && reason.length < 10) {
      this.error.set('Lý do từ chối cần ít nhất 10 ký tự.');
      return;
    }
    this.actionBusy.set(true);
    this.error.set('');
    this.api
      .review(detail.id, status, status === 'REJECTED' ? reason : undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionBusy.set(false);
          this.feedback.set('Đã cập nhật trạng thái hồ sơ.');
          this.openDetail(detail.id);
          this.load();
        },
        error: (error: unknown) => {
          this.actionBusy.set(false);
          this.error.set(this.errorMessage(error));
        },
      });
  }

  protected modeLabel(mode: HairMode): string {
    return mode === 'DONATE' ? 'Hiến tóc' : 'Nhận tóc';
  }

  protected statusLabel(status: HairStatus): string {
    return {
      PENDING: 'Chờ xử lý',
      APPROVED: 'Đã duyệt',
      REJECTED: 'Đã từ chối',
      COMPLETED: 'Hoàn tất',
    }[status];
  }

  private load(): void {
    const requestId = ++this.requestId;
    this.loading.set(true);
    this.error.set('');
    this.api
      .list({
        mode: this.mode() === 'ALL' ? undefined : (this.mode() as HairMode),
        status: this.status() === 'ALL' ? undefined : (this.status() as HairStatus),
        q: this.search().trim() || undefined,
        page: this.page(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (requestId !== this.requestId) return;
          this.result.set(result);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          if (requestId !== this.requestId) return;
          this.error.set(this.errorMessage(error));
          this.loading.set(false);
        },
      });
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message ?? error.error?.error?.message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join(', ');
      if (error.status === 403) return 'Bạn không có quyền quản lý hồ sơ hiến/nhận tóc.';
    }
    return 'Không thể tải hoặc cập nhật hồ sơ. Vui lòng thử lại.';
  }
}
