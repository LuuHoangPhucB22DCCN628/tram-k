import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';

import {
  ManagedResourceAdminApiService,
  type AdminManagedResourceState,
} from '@core/data/managed-resource-admin-api.service';
import {
  ManagedResourceSyncService,
  type ManagedResourceSyncInput,
  type ManagedResourceType,
} from '@core/data/managed-resource-sync.service';
import { MediaUploadApiService, type MediaUploadKind } from '@core/data/media-upload-api.service';
import { MOCK_CONTENT_ITEMS } from '@features/content/data/content.mock-data';
import type { ContentDetail } from '@features/content/models/content.models';
import { ContentAdminStorageService } from '@features/content/services/content-admin-storage.service';
import { DEFAULT_PODCASTS } from '@features/mental-health/data/podcast.data';
import type { PodcastItem } from '@features/mental-health/models/podcast.models';
import { PodcastAdminStorageService } from '@features/mental-health/services/podcast-admin-storage.service';

const CONTENT_TYPES = ['GUIDE', 'CANCER_TYPE', 'STORY'] as const;

@Injectable({ providedIn: 'root' })
export class AdminContentBootstrapService {
  private readonly adminApi = inject(ManagedResourceAdminApiService);
  private readonly sync = inject(ManagedResourceSyncService);
  private readonly media = inject(MediaUploadApiService);
  private readonly contentStorage = inject(ContentAdminStorageService);
  private readonly podcastStorage = inject(PodcastAdminStorageService);
  private readonly loadingState = signal(false);
  private readonly messageState = signal('');
  private started = false;

  readonly loading = this.loadingState.asReadonly();
  readonly message = this.messageState.asReadonly();

  initialize(): void {
    if (this.started) return;
    this.started = true;
    this.loadingState.set(true);

    forkJoin({
      guide: this.adminApi.state('GUIDE'),
      cancer: this.adminApi.state('CANCER_TYPE'),
      story: this.adminApi.state('STORY'),
      podcast: this.adminApi.state('PODCAST'),
    }).subscribe({
      next: (states) => {
        if (!states.guide || !states.cancer || !states.story || !states.podcast) {
          this.loadingState.set(false);
          return;
        }
        void this.hydrateAndMigrate({
          guide: states.guide,
          cancer: states.cancer,
          story: states.story,
          podcast: states.podcast,
        }).finally(() => this.loadingState.set(false));
      },
      error: () => this.loadingState.set(false),
    });
  }

  private async hydrateAndMigrate(states: {
    readonly guide: AdminManagedResourceState;
    readonly cancer: AdminManagedResourceState;
    readonly story: AdminManagedResourceState;
    readonly podcast: AdminManagedResourceState;
  }): Promise<void> {
    const contentStates = new Map<ManagedResourceType, AdminManagedResourceState>([
      ['GUIDE', states.guide],
      ['CANCER_TYPE', states.cancer],
      ['STORY', states.story],
    ]);
    const allLocalContent = this.contentStorage.resolve(MOCK_CONTENT_ITEMS);
    const legacyContent = this.contentStorage.migrationItems(MOCK_CONTENT_ITEMS, false);
    const allLocalPodcasts = this.podcastStorage.resolve(DEFAULT_PODCASTS);
    const legacyPodcasts = this.podcastStorage.migrationItems(DEFAULT_PODCASTS, false);
    const remoteContent = [...contentStates.values()].flatMap((state) =>
      state.items.map((item) => item.payload).filter(isContentDetail),
    );
    const remotePodcasts = states.podcast.items.map((item) => item.payload).filter(isPodcastItem);
    const migrationContent = CONTENT_TYPES.flatMap((type) => {
      const state = contentStates.get(type)!;
      const source = state.initialized ? legacyContent : allLocalContent;
      return source.filter((item) => item.kind === type);
    });
    const migrationPodcasts = states.podcast.initialized ? legacyPodcasts : allLocalPodcasts;

    try {
      const migratedContent: ContentDetail[] = [];
      for (const item of migrationContent) {
        const externalized = await this.externalizeMedia(item);
        if (!(await firstValueFrom(this.sync.upsertResult(this.contentInput(externalized))))) {
          throw new Error('Content sync failed');
        }
        migratedContent.push(externalized);
      }
      const migratedPodcasts: PodcastItem[] = [];
      for (const podcast of migrationPodcasts) {
        const externalized = await this.externalizeMedia(podcast);
        if (!(await firstValueFrom(this.sync.upsertResult(this.podcastInput(externalized))))) {
          throw new Error('Podcast sync failed');
        }
        migratedPodcasts.push(externalized);
      }

      this.contentStorage.replaceResolved(this.mergeById(remoteContent, migratedContent));
      this.podcastStorage.replaceResolved(this.mergeById(remotePodcasts, migratedPodcasts));
      this.contentStorage.clearLegacyState();
      this.podcastStorage.clearLegacyState();
      this.messageState.set('Kho nội dung đã được đồng bộ với máy chủ.');
    } catch {
      this.messageState.set(
        'Chưa thể chuyển toàn bộ dữ liệu cũ lên máy chủ. Bản cũ vẫn được giữ an toàn trên trình duyệt.',
      );
    }
  }

  private async externalizeMedia<T>(value: T): Promise<T> {
    if (typeof value === 'string' && value.startsWith('data:')) {
      const kind: MediaUploadKind = value.startsWith('data:image/') ? 'image' : 'audio';
      const file = this.dataUrlToFile(value, kind);
      const uploaded = await firstValueFrom(this.media.upload(file, kind));
      if (!uploaded) throw new Error('Media upload failed');
      return uploaded.url as T;
    }
    if (Array.isArray(value)) {
      return (await Promise.all(value.map((item) => this.externalizeMedia(item)))) as T;
    }
    if (value && typeof value === 'object') {
      const entries = await Promise.all(
        Object.entries(value as Record<string, unknown>).map(async ([key, nested]) => [
          key,
          await this.externalizeMedia(nested),
        ]),
      );
      return Object.fromEntries(entries) as T;
    }
    return value;
  }

  private dataUrlToFile(value: string, kind: MediaUploadKind): File {
    const match = /^data:([^;,]+);base64,(.+)$/.exec(value);
    if (!match) throw new Error('Invalid data URL');
    const mimeType = match[1];
    const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
    const extension =
      mimeType.split('/')[1]?.replace('jpeg', 'jpg').replace('x-m4a', 'm4a') ?? kind;
    return new File([bytes], `legacy-${crypto.randomUUID()}.${extension}`, { type: mimeType });
  }

  private contentInput(item: ContentDetail): ManagedResourceSyncInput {
    const basePath = {
      GUIDE: '/cam-nang',
      STORY: '/cau-chuyen/bai-viet',
      CANCER_TYPE: '/loai-ung-thu/bai-viet',
    }[item.kind];
    const label = { GUIDE: 'Cẩm nang', STORY: 'Câu chuyện', CANCER_TYPE: 'Loại ung thư' }[
      item.kind
    ];
    return {
      sourceId: item.id,
      type: item.kind,
      status: item.status,
      title: item.title,
      description: item.excerpt,
      eyebrow: label,
      metadata: `${item.category.name} · ${item.readingMinutes} phút đọc`,
      imageUrl: item.coverImage.url,
      imageAlt: item.coverImage.alt,
      link: `${basePath}/${item.slug}`,
      publishedAt: item.publishedAt,
      payload: item as unknown as Readonly<Record<string, unknown>>,
    };
  }

  private podcastInput(item: PodcastItem): ManagedResourceSyncInput {
    return {
      sourceId: item.id,
      type: 'PODCAST',
      status: item.status,
      title: item.title,
      description: item.description,
      eyebrow: 'Podcast',
      metadata: item.source,
      imageUrl: item.image,
      imageAlt: item.imageAlt,
      link: '/goc-tam-ly',
      publishedAt: item.publishedAt,
      payload: item as unknown as Readonly<Record<string, unknown>>,
    };
  }

  private mergeById<T extends { readonly id: string }>(
    remote: readonly T[],
    migrated: readonly T[],
  ): readonly T[] {
    const items = new Map(remote.map((item) => [item.id, item]));
    for (const item of migrated) items.set(item.id, item);
    return [...items.values()];
  }
}

function isContentDetail(value: unknown): value is ContentDetail {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'id' in value &&
    'kind' in value &&
    'status' in value &&
    'coverImage' in value,
  );
}

function isPodcastItem(value: unknown): value is PodcastItem {
  return Boolean(
    value && typeof value === 'object' && 'id' in value && 'status' in value && 'image' in value,
  );
}
