import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiPagination } from '../ui-pagination/ui-pagination';

@Component({
  selector: 'app-ui-section-more',
  standalone: true,
  imports: [UiPagination],
  templateUrl: './ui-section-more.html',
  styleUrl: './ui-section-more.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiSectionMore {
  readonly expanded = input(false);
  readonly remaining = input(0);
  readonly page = input(1);
  readonly totalPages = input(1);
  readonly moreLabel = input('Xem thêm');
  readonly lessLabel = input('Thu gọn');
  readonly toggled = output<void>();
  readonly pageChange = output<number>();

  protected readonly visible = computed(() => this.expanded() || this.remaining() > 0);
  protected readonly accessibleLabel = computed(() =>
    this.expanded() ? this.lessLabel() : `${this.moreLabel()} ${this.remaining()} nội dung`,
  );
}
