import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import {
  AdminDonationEntry,
  AdminDonationsApiService,
  DonationStatus,
  StatementImportResult,
  StatementMapping,
  StatementPreview,
} from '../../services/admin-donations-api.service';

type MappingField = keyof StatementMapping;

@Component({
  selector: 'app-admin-donations-page',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-donations-page.html',
  styleUrl: './admin-donations-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDonationsPage {
  private readonly api = inject(AdminDonationsApiService);
  protected readonly file = signal<File | null>(null);
  protected readonly preview = signal<StatementPreview | null>(null);
  protected readonly sheet = signal('');
  protected readonly headerRow = signal(1);
  protected readonly accountKey = signal('');
  protected readonly mapping = signal<StatementMapping>({ date: -1, credit: -1 });
  protected readonly loading = signal(false);
  protected readonly importing = signal(false);
  protected readonly reviewing = signal(false);
  protected readonly error = signal('');
  protected readonly result = signal<StatementImportResult | null>(null);
  protected readonly status = signal<DonationStatus>('PENDING');
  protected readonly entries = signal<readonly AdminDonationEntry[]>([]);
  protected readonly selectedIds = signal<readonly string[]>([]);
  protected readonly reviewNote = signal('');
  protected readonly mappingFields: readonly { readonly key: MappingField; readonly label: string; readonly required: boolean }[] = [
    { key: 'date', label: 'Ngày giờ giao dịch', required: true },
    { key: 'credit', label: 'Tiền vào', required: true },
    { key: 'reference', label: 'Mã giao dịch', required: false },
    { key: 'debit', label: 'Tiền ra', required: false },
    { key: 'description', label: 'Nội dung', required: false },
  ];
  protected readonly formatVnd = (amount: string): string => new Intl.NumberFormat('vi-VN').format(BigInt(amount));

  constructor() { this.refresh(); }

  protected selectFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.file.set(file);
    this.preview.set(null);
    this.result.set(null);
    this.error.set('');
    this.sheet.set('');
    if (file) this.inspect(file);
  }

  protected selectSheet(event: Event): void {
    const sheet = (event.target as HTMLSelectElement).value;
    this.sheet.set(sheet);
    const file = this.file();
    if (file) this.inspect(file, sheet);
  }

  protected setHeaderRow(event: Event): void {
    const row = Number((event.target as HTMLSelectElement).value);
    this.headerRow.set(row);
    this.guessMapping();
  }

  protected headers(): readonly string[] {
    return this.preview()?.rows[this.headerRow() - 1] ?? [];
  }

  protected updateMapping(field: MappingField, event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    const next = { ...this.mapping() };
    if (value < 0 && field !== 'date' && field !== 'credit') delete next[field];
    else next[field] = value;
    this.mapping.set(next);
  }

  protected importStatement(): void {
    const file = this.file();
    if (!file || !this.accountKey().trim() || this.mapping().date < 0 || this.mapping().credit < 0) {
      this.error.set('Chọn tệp, nhập tài khoản nhận và ghép cột ngày giờ, tiền vào.');
      return;
    }
    this.importing.set(true);
    this.error.set('');
    this.api.import(file, this.accountKey().trim(), this.sheet(), this.headerRow(), this.mapping()).subscribe({
      next: (result) => { this.result.set(result); this.importing.set(false); this.refresh(); },
      error: (error: HttpErrorResponse) => { this.error.set(errorMessage(error)); this.importing.set(false); },
    });
  }

  protected changeStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as DonationStatus);
    this.selectedIds.set([]);
    this.refresh();
  }

  protected toggleSelection(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedIds.update((current) => checked ? [...current, id] : current.filter((item) => item !== id));
  }

  protected selectAll(event: Event): void {
    this.selectedIds.set((event.target as HTMLInputElement).checked ? this.entries().map((entry) => entry.id) : []);
  }

  protected review(status: 'CONFIRMED' | 'REJECTED'): void {
    const ids = this.selectedIds();
    if (!ids.length) return;
    const action = status === 'CONFIRMED' ? 'xác nhận và công khai' : 'từ chối';
    if (!window.confirm(`Bạn chắc chắn muốn ${action} ${ids.length} giao dịch?`)) return;
    this.reviewing.set(true);
    this.error.set('');
    this.api.review(ids, status, this.reviewNote()).subscribe({
      next: () => { this.reviewing.set(false); this.selectedIds.set([]); this.reviewNote.set(''); this.refresh(); },
      error: (error: HttpErrorResponse) => { this.error.set(errorMessage(error)); this.reviewing.set(false); this.refresh(); },
    });
  }

  private inspect(file: File, sheet?: string): void {
    this.loading.set(true);
    this.api.inspect(file, sheet).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.sheet.set(preview.selectedSheet);
        this.headerRow.set(1);
        this.guessMapping();
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => { this.error.set(errorMessage(error)); this.loading.set(false); },
    });
  }

  private guessMapping(): void {
    const headers = this.headers().map((header) => header.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
    const index = (pattern: RegExp) => headers.findIndex((header) => pattern.test(header));
    const date = index(/ngay|thoi gian|date|time/);
    const credit = index(/tien vao|ghi co|credit|amount in|so tien nhan/);
    const reference = index(/ma giao dich|transaction|reference|so tham chieu/);
    const debit = index(/tien ra|ghi no|debit|amount out/);
    const description = index(/noi dung|dien giai|description|memo/);
    this.mapping.set({ date, credit, ...(reference >= 0 ? { reference } : {}),
      ...(debit >= 0 ? { debit } : {}), ...(description >= 0 ? { description } : {}) });
  }

  private refresh(): void {
    this.api.list(this.status()).subscribe({
      next: (entries) => this.entries.set(entries),
      error: (error: HttpErrorResponse) => this.error.set(errorMessage(error)),
    });
  }
}

function errorMessage(error: HttpErrorResponse): string {
  const message = error.error?.error?.message;
  return Array.isArray(message) ? message.join(' ') : typeof message === 'string' ? message : 'Không kết nối được máy chủ. Vui lòng thử lại.';
}
