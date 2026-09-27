import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { Router } from '@angular/router';

import { DestinyStoryHero } from '../../components/destiny-story-hero/destiny-story-hero';
import { StoryCardDecoration } from '../../components/story-card-decoration/story-card-decoration';

interface StoryCardChoice {
  readonly id: 'black' | 'white';
  readonly label: string;
  readonly image: string;
  readonly route?: string;
}

export const CARD_SELECTION_NAVIGATION_DELAY_MS = 1322;

@Component({
  selector: 'app-destiny-story-page',
  standalone: true,
  imports: [DestinyStoryHero, StoryCardDecoration],
  templateUrl: './destiny-story-page.html',
  styleUrl: './destiny-story-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DestinyStoryPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private navigationTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly cardChoices: readonly StoryCardChoice[] = [
    {
      id: 'black',
      label: 'Chọn lá bài màu đen',
      image: '/assets/images/stories/card-black.svg',
      route: '/cau-chuyen/bong-toi',
    },
    {
      id: 'white',
      label: 'Chọn lá bài màu trắng',
      image: '/assets/images/stories/card-white.svg',
      route: '/cau-chuyen/anh-sang',
    },
  ];

  protected selectionMessage = '';
  protected selectedCardId: StoryCardChoice['id'] | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.navigationTimer) {
        clearTimeout(this.navigationTimer);
      }
    });
  }

  protected selectCard(choice: StoryCardChoice): void {
    if (this.selectedCardId !== null) {
      return;
    }

    this.selectedCardId = choice.id;
    this.selectionMessage = choice.route
      ? `${choice.label}. Đang mở câu chuyện.`
      : `${choice.label}. Nội dung tiếp theo sẽ được hoàn thiện ở bước kế tiếp.`;

    if (!choice.route) {
      return;
    }

    this.navigationTimer = setTimeout(() => {
      void this.router.navigateByUrl(choice.route!);
    }, CARD_SELECTION_NAVIGATION_DELAY_MS);
  }
}
