import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminDonationsApiService, PublicDonationSummary } from '@features/admin/services/admin-donations-api.service';

@Component({
  selector: 'app-donation-statement-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './donation-statement-page.html',
  styleUrl: './donation-statement-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonationStatementPage {
  private readonly api = inject(AdminDonationsApiService);
  protected readonly summary = signal<PublicDonationSummary | null>(null);
  protected readonly page = signal(1);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly formatVnd = (value: string) => new Intl.NumberFormat('vi-VN').format(BigInt(value));
  protected readonly Math = Math;

  constructor() { this.load(); }

  protected changePage(delta: number): void {
    const next = this.page() + delta;
    if (next < 1 || next > Math.ceil((this.summary()?.totalCount ?? 0) / 20)) return;
    this.page.set(next);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.publicList(20, this.page()).subscribe({
      next: (summary) => { this.summary.set(summary); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
}
