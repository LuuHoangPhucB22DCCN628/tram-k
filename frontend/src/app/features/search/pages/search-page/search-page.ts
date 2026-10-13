import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { RevealDirective } from '@shared/directives/reveal.directive';
import { UiPagination } from '@shared/ui';
import { paginateItems, parsePaginationPage } from '@shared/utils/pagination';

import {
  isSearchResultType,
  SEARCH_TYPE_OPTIONS,
  type SearchResultItem,
  type SearchResultType,
} from '../../models/search.models';
import { SiteSearchService } from '../../services/site-search.service';

const SEARCH_PAGE_SIZE = 8;

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [FormsModule, RevealDirective, RouterLink, UiPagination],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly searchService = inject(SiteSearchService);
  private readonly destroyRef = inject(DestroyRef);
  private requestVersion = 0;
  private lastLoadedQuery = '';

  protected readonly searchInput = signal('');
  protected readonly query = signal('');
  protected readonly selectedType = signal<'ALL' | SearchResultType>('ALL');
  protected readonly page = signal(1);
  protected readonly results = signal<readonly SearchResultItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly validationMessage = signal('');
  protected readonly typeOptions = SEARCH_TYPE_OPTIONS;
  protected readonly hasSearched = computed(() => this.query().length > 0);
  protected readonly filteredResults = computed(() => {
    const type = this.selectedType();
    return type === 'ALL' ? this.results() : this.results().filter((item) => item.type === type);
  });
  protected readonly pagination = computed(() =>
    paginateItems(this.filteredResults(), this.page(), SEARCH_PAGE_SIZE),
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((parameters) => {
      const query = (parameters.get('q') ?? '').trim();
      const requestedType = parameters.get('type');
      const requestedPage = parsePaginationPage(parameters.get('page')) ?? 1;

      this.searchInput.set(query);
      this.query.set(query);
      this.selectedType.set(isSearchResultType(requestedType) ? requestedType : 'ALL');
      this.page.set(requestedPage);
      this.validationMessage.set('');

      if (!query) {
        this.results.set([]);
        this.errorMessage.set('');
        this.loading.set(false);
        this.lastLoadedQuery = '';
        return;
      }

      if (query !== this.lastLoadedQuery) void this.loadResults(query);
    });
  }

  protected submitSearch(): void {
    const query = this.searchInput().trim();
    if (query.length < 2) {
      this.validationMessage.set('Vui lòng nhập ít nhất 2 ký tự để tìm kiếm.');
      return;
    }

    this.validationMessage.set('');
    if (query === this.query()) {
      void this.loadResults(query);
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: query, type: null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected clearSearch(): void {
    this.searchInput.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null, type: null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected useSuggestion(query: string): void {
    this.searchInput.set(query);
    this.submitSearch();
  }

  protected selectType(type: 'ALL' | SearchResultType): void {
    if (type === this.selectedType()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { type: type === 'ALL' ? null : type, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected selectPage(page: number): void {
    void this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams: { page: page === 1 ? null : page },
        queryParamsHandling: 'merge',
      })
      .then(() =>
        document.querySelector('.search-results')?.scrollIntoView({ behavior: 'smooth' }),
      );
  }

  protected countFor(type: 'ALL' | SearchResultType): number {
    return type === 'ALL'
      ? this.results().length
      : this.results().filter((item) => item.type === type).length;
  }

  protected retry(): void {
    void this.loadResults(this.query());
  }

  private async loadResults(query: string): Promise<readonly SearchResultItem[]> {
    const currentRequest = ++this.requestVersion;
    this.lastLoadedQuery = query;
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const results = await firstValueFrom(this.searchService.search(query));
      if (currentRequest !== this.requestVersion) return [];
      this.results.set(results);
      return results;
    } catch {
      if (currentRequest !== this.requestVersion) return [];
      this.results.set([]);
      this.errorMessage.set('Không thể tìm kiếm lúc này. Vui lòng thử lại sau.');
      return [];
    } finally {
      if (currentRequest === this.requestVersion) this.loading.set(false);
    }
  }
}
