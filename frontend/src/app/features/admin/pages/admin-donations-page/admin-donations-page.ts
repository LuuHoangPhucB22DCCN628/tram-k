import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
type AmountMode = 'SIGNED_AMOUNT' | 'SEPARATE_COLUMNS';

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
  protected readonly amountMode = signal<AmountMode>('SIGNED_AMOUNT');
  protected readonly mapping = signal<StatementMapping>({ date: -1, amount: -1 });
  protected readonly loading = signal(false);
  protected readonly importing = signal(false);
  protected readonly reviewing = signal(false);
  protected readonly error = signal('');
  protected readonly result = signal<StatementImportResult | null>(null);
  protected readonly status = signal<DonationStatus>('PENDING');
  protected readonly entries = signal<readonly AdminDonationEntry[]>([]);
  protected readonly selectedIds = signal<readonly string[]>([]);
  protected readonly reviewNote = signal('');
  protected readonly mappingFields = computed<readonly {
    readonly key: MappingField;
    readonly label: string;
    readonly required: boolean;
  }[]>(() => this.amountMode() === 'SIGNED_AMOUNT'
    ? [
        { key: 'date', label: 'Ngày giờ giao dịch', required: true },
        { key: 'amount', label: 'Số tiền có dấu', required: true },
        { key: 'direction', label: 'Loại giao dịch', required: false },
        { key: 'reference', label: 'Mã giao dịch', required: false },
        { key: 'description', label: 'Nội dung', required: false },
      ]
    : [
        { key: 'date', label: 'Ngày giờ giao dịch', required: true },
        { key: 'credit', label: 'Tiền vào', required: true },
        { key: 'debit', label: 'Tiền ra', required: false },
        { key: 'reference', label: 'Mã giao dịch', required: false },
        { key: 'description', label: 'Nội dung', required: false },
      ]);
  protected readonly importBlockReason = computed(() => {
    const mapping = this.mapping();
    if (!this.file()) return 'Hãy chọn tệp sao kê.';
    if (!this.accountKey().trim()) return 'Hãy nhập mã tài khoản nhận tiền để chống nhập trùng.';
    if (mapping.date < 0) return 'Hãy chọn cột ngày giờ giao dịch.';
    if (this.amountMode() === 'SIGNED_AMOUNT' && (mapping.amount ?? -1) < 0) {
      return 'Hãy chọn cột số tiền có dấu.';
    }
    if (this.amountMode() === 'SEPARATE_COLUMNS' && (mapping.credit ?? -1) < 0) {
      return 'Hãy chọn cột tiền vào.';
    }
    const columns = Object.values(mapping).filter((value) => value >= 0);
    if (new Set(columns).size !== columns.length) return 'Mỗi trường phải dùng một cột khác nhau.';
    return '';
  });
  protected readonly canImport = computed(() => !this.importBlockReason());
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
    const required = field === 'date' ||
      (this.amountMode() === 'SIGNED_AMOUNT' ? field === 'amount' : field === 'credit');
    if (value < 0 && !required) delete next[field];
    else next[field] = value;
    this.mapping.set(next);
  }

  protected changeAmountMode(event: Event): void {
    this.amountMode.set((event.target as HTMLSelectElement).value as AmountMode);
    this.guessMapping(this.amountMode());
  }

  protected importStatement(): void {
    const file = this.file();
    if (!file || !this.canImport()) {
      this.error.set('Chọn tệp, nhập mã tài khoản và ghép cột ngày giờ cùng cột số tiền.');
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

  private guessMapping(preferredMode?: AmountMode): void {
    const headers = this.headers().map((header) => header.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
    const index = (pattern: RegExp) => headers.findIndex((header) => pattern.test(header));
    const date = index(/ngay|thoi gian|date|time/);
    const credit = index(/tien vao|ghi co|credit|amount in|so tien nhan/);
    const amount = index(/(^|\b)(so tien|amount|gia tri)(\b|$)/);
    const reference = index(/ma giao dich|transaction|reference|so tham chieu/);
    const debit = index(/tien ra|ghi no|debit|amount out/);
    const direction = index(/loai giao dich|transaction type|thu chi|dong tien/);
    const description = index(/noi dung|dien giai|description|memo/);
    const mode = preferredMode ?? (credit >= 0 || debit >= 0 ? 'SEPARATE_COLUMNS' : 'SIGNED_AMOUNT');
    this.amountMode.set(mode);
    this.mapping.set(mode === 'SIGNED_AMOUNT'
      ? { date, amount, ...(direction >= 0 ? { direction } : {}),
          ...(reference >= 0 ? { reference } : {}),
          ...(description >= 0 ? { description } : {}) }
      : { date, credit, ...(debit >= 0 ? { debit } : {}),
          ...(reference >= 0 ? { reference } : {}),
          ...(description >= 0 ? { description } : {}) });
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
