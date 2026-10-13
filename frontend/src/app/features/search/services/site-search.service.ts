import { inject, Injectable } from '@angular/core';
import { forkJoin, map, of, type Observable } from 'rxjs';

import type { CharitySupportType } from '@features/account/models/charity-program.models';
import { CharityProgramStorageService } from '@features/account/services/charity-program-storage.service';
import type { ContentKind, ContentSummary } from '@features/content/models/content.models';
import { ContentService } from '@features/content/services/content.service';
import type { PodcastItem } from '@features/mental-health/models/podcast.models';
import { PublishedPodcastService } from '@features/mental-health/services/published-podcast.service';
import { normalizeSearchText } from '@shared/utils/search-text';

import type { SearchResultItem, SearchResultType } from '../models/search.models';
import { SiteSearchApiService } from './site-search-api.service';

const CONTENT_KINDS: readonly ContentKind[] = ['GUIDE', 'CANCER_TYPE', 'STORY'];

@Injectable({ providedIn: 'root' })
export class SiteSearchService {
  private readonly content = inject(ContentService);
  private readonly podcasts = inject(PublishedPodcastService);
  private readonly programs = inject(CharityProgramStorageService);
  private readonly api = inject(SiteSearchApiService);

  search(query: string): Observable<readonly SearchResultItem[]> {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return of([]);

    return forkJoin({
      remote: this.api.search(query),
      local: this.searchLocal(normalizedQuery),
    }).pipe(map(({ remote, local }) => this.mergeResults(remote ?? [], local)));
  }

  private searchLocal(normalizedQuery: string): Observable<readonly SearchResultItem[]> {
    return forkJoin(
      CONTENT_KINDS.map((kind) =>
        this.content.list({ kind, search: normalizedQuery, page: 1, pageSize: 16 }),
      ),
    ).pipe(
      map((contentPages) => {
        const contentResults = contentPages.flatMap((page) =>
          page.items.map((item) => this.fromContent(item, normalizedQuery)),
        );
        const podcastResults = this.podcasts
          .items()
          .filter((podcast) =>
            this.matches(normalizedQuery, podcast.title, podcast.description, podcast.source),
          )
          .map((podcast) => this.fromPodcast(podcast, normalizedQuery));
        const programResults = this.programs
          .all()
          .filter((program) => program.status === 'PUBLISHED')
          .filter((program) =>
            this.matches(
              normalizedQuery,
              program.title,
              program.description,
              program.city,
              program.address,
              this.supportTypeLabel(program.supportType),
            ),
          )
          .map<SearchResultItem>((program) => ({
            id: program.id,
            type: 'SUPPORT_PROGRAM',
            title: program.title,
            description: program.description,
            eyebrow: 'Chương trình hỗ trợ',
            metadata: `${this.supportTypeLabel(program.supportType)} · ${program.city}`,
            link: '/cong-dong/chuong-trinh-ho-tro',
            queryParams: { program: program.id },
            publishedAt: program.reviewedAt ?? program.updatedAt,
            score: this.score(program.title, program.description, normalizedQuery),
          }));

        return [...contentResults, ...podcastResults, ...programResults].sort(
          (first, second) =>
            second.score - first.score || second.publishedAt.localeCompare(first.publishedAt),
        );
      }),
    );
  }

  private mergeResults(
    remote: readonly SearchResultItem[],
    local: readonly SearchResultItem[],
  ): readonly SearchResultItem[] {
    const results = new Map<string, SearchResultItem>();
    for (const item of [...remote, ...local]) {
      const key = `${item.type}:${item.id}`;
      if (!results.has(key)) results.set(key, item);
    }

    return [...results.values()].sort(
      (first, second) =>
        second.score - first.score || second.publishedAt.localeCompare(first.publishedAt),
    );
  }

  private fromContent(item: ContentSummary, query: string): SearchResultItem {
    const resultType: SearchResultType = item.kind;
    const basePath: Record<ContentKind, string> = {
      GUIDE: '/cam-nang',
      CANCER_TYPE: '/loai-ung-thu/bai-viet',
      STORY: '/cau-chuyen/bai-viet',
    };
    const label: Record<ContentKind, string> = {
      GUIDE: 'Cẩm nang',
      CANCER_TYPE: 'Loại ung thư',
      STORY: 'Câu chuyện',
    };

    return {
      id: item.id,
      type: resultType,
      title: item.title,
      description: item.excerpt,
      eyebrow: label[item.kind],
      metadata: `${item.category.name} · ${item.readingMinutes} phút đọc`,
      image: item.coverImage.url,
      imageAlt: item.coverImage.alt,
      link: `${basePath[item.kind]}/${item.slug}`,
      publishedAt: item.publishedAt,
      score: this.score(
        item.title,
        `${item.excerpt} ${item.category.name} ${item.tags.map((tag) => tag.name).join(' ')}`,
        query,
      ),
    };
  }

  private fromPodcast(podcast: PodcastItem, query: string): SearchResultItem {
    return {
      id: podcast.id,
      type: 'PODCAST',
      title: podcast.title,
      description: podcast.description,
      eyebrow: 'Podcast',
      metadata: podcast.source,
      image: podcast.image,
      imageAlt: podcast.imageAlt,
      link: '/goc-tam-ly',
      queryParams: { podcast: podcast.id },
      publishedAt: podcast.publishedAt,
      score: this.score(podcast.title, `${podcast.description} ${podcast.source}`, query),
    };
  }

  private matches(query: string, ...values: readonly string[]): boolean {
    return normalizeSearchText(values.join(' ')).includes(query);
  }

  private score(title: string, supportingText: string, query: string): number {
    const normalizedTitle = normalizeSearchText(title);
    const normalizedSupportingText = normalizeSearchText(supportingText);
    if (normalizedTitle === query) return 100;
    if (normalizedTitle.startsWith(query)) return 80;
    if (normalizedTitle.includes(query)) return 60;
    return normalizedSupportingText.includes(query) ? 30 : 0;
  }

  private supportTypeLabel(type: CharitySupportType): string {
    return {
      MEAL: 'Suất ăn',
      FINANCIAL: 'Hỗ trợ chi phí',
      TRANSPORT: 'Hỗ trợ di chuyển',
      OTHER: 'Hỗ trợ khác',
    }[type];
  }
}
