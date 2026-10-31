import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import type { ContentSummary } from '@features/content/models/content.models';
import {
  ContentSectionService,
  mergeContentSection,
} from '@features/content/services/content-section.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { DestinyStoryHero } from '../../components/destiny-story-hero/destiny-story-hero';
import { KitchenStoryHero } from '../../components/kitchen-story-hero/kitchen-story-hero';

interface StoryCard {
  readonly image: string;
  readonly title: string;
  readonly description: string;
  readonly route: readonly string[];
}

const FALLBACK_STORIES: readonly StoryCard[] = [
  {
    image: '/assets/images/stories/card-4.png',
    title: "Những chia sẻ từ hành trình vượt qua 'cửa tử' ung thư...",
    description:
      'Câu chuyện về những người bệnh lựa chọn sống tích cực và tìm thấy niềm vui từ những điều bình dị nhất.',
    route: ['/cau-chuyen'],
  },
  {
    image: '/assets/images/stories/card-2.png',
    title: "Một năm chống chọi với 'cuộc chiến ung thư'",
    description:
      'Căn bệnh ung thư hạch bạch huyết (Lymphoma) đến quá sớm với Nguyễn Phương Thảo (2002), ngay khi cô 22 tuổi.',
    route: ['/cau-chuyen'],
  },
  {
    image: '/assets/images/stories/card-7.png',
    title: 'Câu chuyện nghị lực của những người chung sống bình yên...',
    description:
      'Những tiến bộ trong điều trị bệnh ung thư các năm gần đây thêm một lần nữa khẳng định ung thư không phải là dấu chấm hết.',
    route: ['/cau-chuyen'],
  },
  {
    image: '/assets/images/stories/card-8.png',
    title: 'Cảm động với bức thư truyền cảm hứng từ một bệnh nhân ung thư',
    description:
      'Trong thư, người bệnh bày tỏ nỗi lo âu và hoang mang khi đối diện với căn bệnh hiểm nghèo. Nhưng chính tại Khoa Ung Bướu, họ đã tìm thấy sự an ủi và động lực.',
    route: ['/cau-chuyen'],
  },
];

@Component({
  selector: 'app-stories-page',
  standalone: true,
  imports: [DestinyStoryHero, KitchenStoryHero, RouterLink, RevealDirective],
  templateUrl: './stories-page.html',
  styleUrl: './stories-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoriesPage {
  private readonly contentSections = inject(ContentSectionService);
  protected readonly stories = signal<readonly StoryCard[]>(FALLBACK_STORIES);

  constructor() {
    void this.loadStories();
  }

  private async loadStories(): Promise<void> {
    try {
      const published = await firstValueFrom(
        this.contentSections.latestCreated({ kind: 'STORY' }, FALLBACK_STORIES.length),
      );
      const dynamicCards = published.map((item) => this.toStoryCard(item));
      this.stories.set(
        mergeContentSection(
          dynamicCards,
          FALLBACK_STORIES,
          (item) => item.title,
          FALLBACK_STORIES.length,
        ),
      );
    } catch {
      // Giữ nội dung Figma dự phòng nếu nguồn bài viết tạm thời không khả dụng.
    }
  }

  private toStoryCard(item: ContentSummary): StoryCard {
    return {
      image: item.coverImage.url,
      title: item.title,
      description: item.excerpt,
      route: ['/cau-chuyen/bai-viet', item.slug],
    };
  }
}
