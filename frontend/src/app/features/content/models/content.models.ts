export const CONTENT_PAGE_SIZES = [6, 9, 12, 16] as const;

export type ContentPageSize = (typeof CONTENT_PAGE_SIZES)[number];
export type ContentKind = 'GUIDE' | 'STORY' | 'CANCER_TYPE';
export type ContentPublicationStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface ContentCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export interface ContentTag {
  readonly name: string;
  readonly slug: string;
}

export interface ContentImage {
  readonly url: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly crop?: ContentImageCrop;
}

export interface ContentImageCrop {
  readonly widthPercent: number;
  readonly heightPercent: number;
  readonly leftPercent: number;
  readonly topPercent: number;
}

export interface ContentSection {
  readonly heading?: string;
  readonly paragraphs: readonly string[];
  readonly bullets?: readonly string[];
  readonly image?: ContentImage;
  readonly imageCaption?: string;
}

export interface ContentSource {
  readonly label: string;
  readonly publisher: string;
  readonly url?: string;
  readonly reviewedAt: string;
}

export interface ContentSummary {
  readonly id: string;
  readonly kind: ContentKind;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly category: ContentCategory;
  readonly tags: readonly ContentTag[];
  readonly coverImage: ContentImage;
  readonly publishedAt: string;
  readonly readingMinutes: number;
  readonly featured: boolean;
}

export interface ContentDetail extends ContentSummary {
  readonly status: ContentPublicationStatus;
  readonly authorName: string;
  readonly detailLead?: string;
  readonly sections: readonly ContentSection[];
  readonly sources: readonly ContentSource[];
  readonly medicalDisclaimer?: string;
}

export interface ContentListQuery {
  readonly kind?: ContentKind;
  readonly search?: string;
  readonly categorySlug?: string;
  readonly tagSlug?: string;
  readonly featured?: boolean;
  readonly page?: number;
  readonly pageSize?: ContentPageSize;
}

export interface ContentPage<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: ContentPageSize;
  readonly totalItems: number;
  readonly totalPages: number;
}

export class ContentApiError extends Error {
  constructor(
    readonly code: 'CONTENT_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'ContentApiError';
  }
}
