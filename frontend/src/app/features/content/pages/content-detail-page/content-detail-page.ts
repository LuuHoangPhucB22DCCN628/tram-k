import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';
import { MemberCommentStorageService } from '@features/account/services/member-comment-storage.service';
import { RevealDirective } from '@shared/directives/reveal.directive';
import { UiEmptyState, UiErrorState, UiLoading } from '@shared/ui';

import {
  ContentApiError,
  type ContentDetail,
  type ContentSummary,
} from '../../models/content.models';
import { ContentService } from '../../services/content.service';
import { ContentFavoritesService } from '../../services/content-favorites.service';

interface ContentDetailPageConfig {
  readonly kind: ContentDetail['kind'];
  readonly articleBasePath: string;
  readonly backPath: string;
  readonly backLabel: string;
}

const DEFAULT_CONFIG: ContentDetailPageConfig = {
  kind: 'GUIDE',
  articleBasePath: '/cam-nang',
  backPath: '/cam-nang',
  backLabel: 'Cẩm nang',
};

@Component({
  selector: 'app-content-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    RevealDirective,
    UiEmptyState,
    UiErrorState,
    UiLoading,
  ],
  templateUrl: './content-detail-page.html',
  styleUrl: './content-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentDetailPage {
  private readonly contentService = inject(ContentService);
  protected readonly auth = inject(AuthService);
  private readonly commentStorage = inject(MemberCommentStorageService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly favoritesService = inject(ContentFavoritesService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly destroyRef = inject(DestroyRef);
  private slug = '';

  protected readonly config: ContentDetailPageConfig = {
    ...DEFAULT_CONFIG,
    ...((this.route.snapshot?.data ?? {}) as Partial<ContentDetailPageConfig>),
  };

  protected readonly content = signal<ContentDetail | null>(null);
  protected readonly categoryItems = signal<readonly ContentSummary[]>([]);
  protected readonly relatedItems = signal<readonly ContentSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly shareFeedback = signal('');
  protected readonly commentFeedback = signal('');
  protected readonly commentForm = this.formBuilder.nonNullable.group({
    content: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(1000)]],
  });
  protected readonly comments = computed(() =>
    this.commentStorage.commentsForSource(this.articlePath()),
  );
  protected readonly isFavorite = computed(() => {
    const article = this.content();
    this.favoritesService.favoriteIds();
    return article ? this.favoritesService.has(article.id) : false;
  });
  protected readonly sidebarGroups = computed(() => {
    const article = this.content();
    if (!article) return [];

    return [
      { title: article.category.name, items: this.categoryItems() },
      { title: 'Bài viết liên quan', items: this.relatedItems() },
    ].filter((group) => group.items.length > 0);
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.slug = params.get('slug') ?? '';
      void this.loadContent();
    });
  }

  protected retry(): void {
    void this.loadContent();
  }

  protected articleLink(item: ContentSummary): readonly string[] {
    return [this.config.articleBasePath, item.slug];
  }

  protected toggleFavorite(): void {
    const article = this.content();
    if (article) this.favoritesService.toggle(article.id);
  }

  protected async shareArticle(): Promise<void> {
    const article = this.content();
    const browserWindow = document.defaultView;
    if (!article || !browserWindow) return;

    const shareData = {
      title: article.title,
      text: article.excerpt,
      url: browserWindow.location.href,
    };

    try {
      if (browserWindow.navigator.share) {
        await browserWindow.navigator.share(shareData);
        this.shareFeedback.set('Đã mở bảng chia sẻ.');
      } else {
        await browserWindow.navigator.clipboard.writeText(shareData.url);
        this.shareFeedback.set('Đã sao chép liên kết bài viết.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.shareFeedback.set('Không thể chia sẻ bài viết lúc này.');
    }
  }

  protected submitComment(): void {
    const article = this.content();
    const user = this.auth.currentUser();
    if (!article || !user) return;
    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.commentStorage.create(user.id, {
      authorName: user.displayName,
      content: this.commentForm.controls.content.value,
      sourceTitle: article.title,
      sourcePath: this.articlePath(),
    });
    this.commentForm.reset();
    this.commentFeedback.set('Đã gửi bình luận của bạn.');
  }

  protected isOwnComment(userId: string): boolean {
    return this.auth.currentUser()?.id === userId;
  }

  private articlePath(): string {
    return this.slug ? `${this.config.articleBasePath}/${this.slug}` : '';
  }

  private async loadContent(): Promise<void> {
    this.loading.set(true);
    this.notFound.set(false);
    this.errorMessage.set('');
    this.content.set(null);
    this.categoryItems.set([]);
    this.relatedItems.set([]);

    try {
      const detail = await firstValueFrom(
        this.contentService.getBySlug(this.config.kind, this.slug),
      );
      this.content.set(detail);
      this.title.setTitle(`${detail.title} | Trạm K`);
      await this.loadSidebarItems(detail);
    } catch (error) {
      if (error instanceof ContentApiError && error.code === 'CONTENT_NOT_FOUND') {
        this.notFound.set(true);
      } else {
        this.errorMessage.set('Không thể tải bài viết lúc này. Vui lòng thử lại sau.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async loadSidebarItems(detail: ContentDetail): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.contentService.list({
          kind: this.config.kind,
          pageSize: 16,
        }),
      );
      const otherItems = result.items.filter((item) => item.id !== detail.id);
      this.categoryItems.set(
        otherItems.filter((item) => item.category.id === detail.category.id).slice(0, 3),
      );
      this.relatedItems.set(
        otherItems.filter((item) => item.category.id !== detail.category.id).slice(0, 3),
      );
    } catch {
      // Bài viết chính vẫn hiển thị khi API gợi ý tạm thời không khả dụng.
    }
  }
}
