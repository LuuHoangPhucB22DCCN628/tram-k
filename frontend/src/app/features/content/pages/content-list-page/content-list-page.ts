import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { UiEmptyState, UiErrorState, UiLoading, UiPagination } from '@shared/ui';

import type { ContentCategory, ContentKind, ContentSummary } from '../../models/content.models';
import { ContentService } from '../../services/content.service';

interface ContentListPageConfig {
  readonly kind: ContentKind;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly basePath: string;
}

interface ContentGroup {
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string;
  readonly items: readonly ContentSummary[];
}

const GUIDE_GROUPS = [
  {
    slug: 'dinh-duong',
    title: 'Chế độ dinh dưỡng',
    subtitle: 'Chăm sóc cơ thể từ những bữa ăn hằng ngày',
  },
  { slug: 'dau-hieu', title: 'Dấu hiệu', subtitle: 'Lắng nghe cơ thể mỗi ngày' },
  {
    slug: 'dieu-tri',
    title: 'Phương pháp điều trị',
    subtitle: 'Hiểu rõ hành trình điều trị',
  },
  {
    slug: 'cham-soc',
    title: 'Chăm sóc người bệnh',
    subtitle: 'Đồng hành bằng sự thấu hiểu',
  },
] as const;

const DEFAULT_CONFIG: ContentListPageConfig = {
  kind: 'GUIDE',
  title: 'Cẩm nang đồng hành',
  subtitle: 'dành cho bệnh nhân và người thân',
  description:
    'Từ dinh dưỡng, điều trị đến chăm sóc tinh thần, chúng tôi mong muốn mang đến những thông tin dễ hiểu và hữu ích để người bệnh cùng gia đình cảm thấy an tâm hơn trong từng bước đi.',
  basePath: '/cam-nang',
};

@Component({
  selector: 'app-content-list-page',
  standalone: true,
  imports: [FormsModule, RouterLink, UiEmptyState, UiErrorState, UiLoading, UiPagination],
  templateUrl: './content-list-page.html',
  styleUrl: './content-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentListPage {
  private readonly contentService = inject(ContentService);
  private readonly route = inject(ActivatedRoute);
  private requestVersion = 0;

  protected readonly config: ContentListPageConfig = {
    ...DEFAULT_CONFIG,
    ...(this.route.snapshot.data as Partial<ContentListPageConfig>),
  };
  protected readonly items = signal<readonly ContentSummary[]>([]);
  protected readonly categories = signal<readonly ContentCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly page = signal(1);
  protected readonly totalPages = signal(0);
  protected readonly totalItems = signal(0);
  protected readonly filteredView = signal(false);
  protected readonly groupedItems = computed<readonly ContentGroup[]>(() => {
    if (this.filteredView()) {
      return [
        {
          slug: 'ket-qua',
          title: 'Kết quả phù hợp',
          subtitle: 'Những nội dung phù hợp với từ khóa hoặc chủ đề bạn đã chọn',
          items: this.items(),
        },
      ];
    }

    return GUIDE_GROUPS.map((group) => ({
      ...group,
      items: this.items().filter((item) => item.category.slug === group.slug),
    })).filter((group) => group.items.length > 0);
  });
  protected search = '';
  protected selectedCategory = '';

  constructor() {
    void this.initialize();
  }

  protected applyFilters(): void {
    this.filteredView.set(Boolean(this.search.trim() || this.selectedCategory));
    this.page.set(1);
    void this.loadItems();
  }

  protected resetFilters(): void {
    this.search = '';
    this.selectedCategory = '';
    this.applyFilters();
  }

  protected filterByGroup(categorySlug: string): void {
    this.search = '';
    this.selectedCategory = categorySlug;
    this.applyFilters();
    document.querySelector('.content-search')?.scrollIntoView?.({ behavior: 'smooth' });
  }

  protected changePage(nextPage: number): void {
    this.page.set(nextPage);
    void this.loadItems().then(() => {
      document.querySelector('.content-results')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  protected retry(): void {
    void this.loadItems();
  }

  protected articleLink(item: ContentSummary): readonly string[] {
    return [this.config.basePath, item.slug];
  }

  private async initialize(): Promise<void> {
    try {
      this.categories.set(
        await firstValueFrom(this.contentService.getCategories(this.config.kind)),
      );
    } catch {
      // Danh sách bài viết vẫn có thể hoạt động nếu API danh mục tạm thời lỗi.
    }
    await this.loadItems();
  }

  private async loadItems(): Promise<void> {
    const currentRequest = ++this.requestVersion;
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const result = await firstValueFrom(
        this.contentService.list({
          kind: this.config.kind,
          search: this.search.trim() || undefined,
          categorySlug: this.selectedCategory || undefined,
          page: this.page(),
          pageSize: 16,
        }),
      );

      if (currentRequest !== this.requestVersion) return;
      this.items.set(result.items);
      this.totalItems.set(result.totalItems);
      this.totalPages.set(result.totalPages);
    } catch {
      if (currentRequest !== this.requestVersion) return;
      this.items.set([]);
      this.totalItems.set(0);
      this.totalPages.set(0);
      this.errorMessage.set('Không thể tải cẩm nang lúc này. Vui lòng thử lại sau.');
    } finally {
      if (currentRequest === this.requestVersion) this.loading.set(false);
    }
  }
}
