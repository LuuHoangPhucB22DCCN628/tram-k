import { Injectable } from '@angular/core';

import { LegacyAdminState } from '@core/data/legacy-admin-state';
import type { PodcastItem } from '../models/podcast.models';

type PodcastOverride = Partial<Omit<PodcastItem, 'id'>>;

@Injectable({ providedIn: 'root' })
export class PodcastAdminStorageService extends LegacyAdminState<PodcastItem, PodcastOverride> {
  constructor() {
    super('tram-k.podcast-admin-state');
  }
}
