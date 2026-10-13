export type PodcastPublicationStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface PodcastItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly source: string;
  readonly image: string;
  readonly imageAlt: string;
  readonly audioUrl?: string;
  readonly publishedAt: string;
  readonly status: PodcastPublicationStatus;
}

export const PODCAST_LIBRARY_LIMIT = 3;
