import { inject, Injectable } from '@angular/core';

import type { ContentKind, ContentListQuery } from '../models/content.models';
import { ContentMockApiService } from './content-mock-api.service';
import { ContentPublicApiService } from './content-public-api.service';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly api = inject(ContentMockApiService);
  private readonly publicApi = inject(ContentPublicApiService);

  list(query: ContentListQuery = {}) {
    return this.publicApi.isConfigured ? this.publicApi.list(query) : this.api.list(query);
  }

  getBySlug(kind: ContentKind, slug: string) {
    return this.publicApi.isConfigured
      ? this.publicApi.getBySlug(kind, slug)
      : this.api.getBySlug(kind, slug);
  }

  getCategories(kind?: ContentKind) {
    return this.publicApi.isConfigured
      ? this.publicApi.getCategories(kind)
      : this.api.getCategories(kind);
  }
}
