import { inject, Injectable } from '@angular/core';

import type { ContentKind, ContentListQuery } from '../models/content.models';
import { ContentMockApiService } from './content-mock-api.service';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly api = inject(ContentMockApiService);

  list(query: ContentListQuery = {}) {
    return this.api.list(query);
  }

  getBySlug(kind: ContentKind, slug: string) {
    return this.api.getBySlug(kind, slug);
  }

  getCategories(kind?: ContentKind) {
    return this.api.getCategories(kind);
  }
}
