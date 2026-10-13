import { computed, inject, Injectable, signal } from '@angular/core';

import { ManagedResourcePublicApiService } from '@core/data/managed-resource-public-api.service';

import { DEFAULT_PODCASTS } from '../data/podcast.data';
import type { PodcastItem } from '../models/podcast.models';
import { PodcastAdminStorageService } from './podcast-admin-storage.service';

@Injectable({ providedIn: 'root' })
export class PublishedPodcastService {
  private readonly storage = inject(PodcastAdminStorageService);
  private readonly publicResources = inject(ManagedResourcePublicApiService);
  private readonly remoteItems = signal<readonly PodcastItem[] | null>(null);

  readonly items = computed(() => {
    const remote = this.remoteItems();
    if (remote) return remote;
    this.storage.changes();
    return this.storage
      .resolve(DEFAULT_PODCASTS)
      .filter((podcast) => podcast.status === 'PUBLISHED')
      .sort((first, second) => second.publishedAt.localeCompare(first.publishedAt));
  });

  constructor() {
    this.publicResources.state<PodcastItem>('PODCAST', isPodcastItem).subscribe((state) => {
      if (state?.initialized) {
        this.remoteItems.set(
          [...state.items].sort((first, second) =>
            second.publishedAt.localeCompare(first.publishedAt),
          ),
        );
      }
    });
  }
}

function isPodcastItem(payload: unknown): payload is PodcastItem {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Partial<PodcastItem>;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.source === 'string' &&
    typeof value.image === 'string' &&
    typeof value.imageAlt === 'string' &&
    typeof value.publishedAt === 'string' &&
    value.status === 'PUBLISHED'
  );
}
