import { Injectable } from '@angular/core';

import { LegacyAdminState } from '@core/data/legacy-admin-state';
import type { ContentDetail } from '../models/content.models';

type ContentOverride = Partial<
  Pick<
    ContentDetail,
    'title' | 'excerpt' | 'status' | 'category' | 'coverImage' | 'sections' | 'readingMinutes'
  >
>;

@Injectable({ providedIn: 'root' })
export class ContentAdminStorageService extends LegacyAdminState<ContentDetail, ContentOverride> {
  constructor() {
    super('tram-k.content-admin-state');
  }
}
