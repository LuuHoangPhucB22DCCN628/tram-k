import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-ui-pagination',
  standalone: true,
  templateUrl: './ui-pagination.html',
  styleUrl: './ui-pagination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiPagination {
  readonly page = input(1);
  readonly totalPages = input(1);
  readonly pageChange = output<number>();

  protected readonly visiblePages = computed(() => {
    const total = Math.max(1, this.totalPages());
    const current = Math.min(Math.max(1, this.page()), total);
    const start = Math.max(1, Math.min(current - 2, total - 4));
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  protected selectPage(nextPage: number): void {
    const normalizedPage = Math.min(Math.max(1, nextPage), Math.max(1, this.totalPages()));
    if (normalizedPage !== this.page()) this.pageChange.emit(normalizedPage);
  }
}
