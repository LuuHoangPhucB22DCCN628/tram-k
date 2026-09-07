import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-section-placeholder-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './section-placeholder-page.html',
  styleUrl: './section-placeholder-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionPlaceholderPage {
  private readonly route = inject(ActivatedRoute); // Đọc nội dung khung từ data của route hiện tại.

  protected readonly heading = this.readRouteText('heading', 'Trang đang được xây dựng');
  protected readonly description = this.readRouteText(
    'description',
    'Nội dung của chức năng này sẽ được triển khai ở phase tiếp theo.',
  );
  protected readonly showPublicBackLink = !['member', 'admin'].includes(
    String(this.route.snapshot.data['area'] ?? 'public'),
  );

  private readRouteText(key: string, fallback: string): string {
    const value: unknown = this.route.snapshot.data[key];
    return typeof value === 'string' ? value : fallback;
  }
}
