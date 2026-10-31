import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { SOCIAL_LINKS } from '../../../../core/config/social-links';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { CountUpDirective } from '../../../../shared/directives/count-up.directive';
import type { ContentSummary } from '../../../content/models/content.models';
import {
  ContentSectionService,
  mergeContentSection,
} from '../../../content/services/content-section.service';
import { CANCER_DETAILS } from '../../data/cancer-details.data';
import { CANCER_FACTS, CANCER_TYPES } from '../../data/cancer-types.data';

interface CancerCard {
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly image: string;
  readonly imageAlt: string;
  readonly route: readonly string[];
}

const FALLBACK_CANCERS: readonly CancerCard[] = CANCER_TYPES.filter((item) => !item.featured).map(
  (item) => ({
    slug: item.slug,
    title: item.name,
    excerpt: item.summary,
    image: item.image,
    imageAlt: item.imageAlt,
    route: ['/loai-ung-thu', item.slug],
  }),
);

@Component({
  selector: 'app-cancer-types-page',
  imports: [RouterLink, RevealDirective, CountUpDirective],
  templateUrl: './cancer-types-page.html',
  styleUrl: './cancer-types-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancerTypesPage {
  private readonly contentSections = inject(ContentSectionService);
  protected readonly facts = CANCER_FACTS;
  protected readonly otherTypes = signal<readonly CancerCard[]>(FALLBACK_CANCERS);
  protected readonly socialLinks = [...SOCIAL_LINKS];

  constructor() {
    void this.loadCancerArticles();
  }

  protected scrollToCancerTypes(event: MouseEvent): void {
    event.preventDefault();
    document.getElementById('cancer-types')?.scrollIntoView({ behavior: 'smooth' });
  }

  private async loadCancerArticles(): Promise<void> {
    try {
      const published = await firstValueFrom(
        this.contentSections.latestCreated(
          { kind: 'CANCER_TYPE', featured: false },
          FALLBACK_CANCERS.length,
        ),
      );
      const dynamicCards = published.map((item) => this.toCancerCard(item));
      this.otherTypes.set(
        mergeContentSection(
          dynamicCards,
          FALLBACK_CANCERS,
          (item) => item.slug,
          FALLBACK_CANCERS.length,
        ),
      );
    } catch {
      // Giữ các thẻ Figma dự phòng nếu nguồn bài viết tạm thời không khả dụng.
    }
  }

  private toCancerCard(item: ContentSummary): CancerCard {
    return {
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt,
      image: item.coverImage.url,
      imageAlt: item.coverImage.alt,
      route: CANCER_DETAILS[item.slug]
        ? ['/loai-ung-thu', item.slug]
        : ['/loai-ung-thu/bai-viet', item.slug],
    };
  }
}
