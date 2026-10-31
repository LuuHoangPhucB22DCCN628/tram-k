import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { KitchenStoryHero } from '../../components/kitchen-story-hero/kitchen-story-hero';

interface StoryPhoto {
  readonly src: string;
  readonly alt: string;
}

const PHOTO_BASE = '/assets/images/stories/kitchen-story';

@Component({
  selector: 'app-kitchen-story-page',
  standalone: true,
  imports: [KitchenStoryHero, RouterLink],
  templateUrl: './kitchen-story-page.html',
  styleUrl: './kitchen-story-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitchenStoryPage {
  protected readonly firstGallery: readonly StoryPhoto[] = [
    {
      src: `${PHOTO_BASE}/intro-1.jpg`,
      alt: 'Tình nguyện viên chuẩn bị những suất cơm tại Bếp An Yên',
    },
    { src: `${PHOTO_BASE}/intro-2.jpg`, alt: 'Các phần ăn được sắp xếp để trao cho người bệnh' },
    {
      src: `${PHOTO_BASE}/intro-3.jpg`,
      alt: 'Những đôi bàn tay chung sức tại căn bếp thiện nguyện',
    },
  ];

  protected readonly secondGallery: readonly StoryPhoto[] = [
    { src: `${PHOTO_BASE}/shelter-1.jpg`, alt: 'Không gian nghỉ ngơi của Mái ấm An Yên' },
    { src: `${PHOTO_BASE}/shelter-2.jpg`, alt: 'Người bệnh tại Mái ấm An Yên' },
    { src: `${PHOTO_BASE}/shelter-3.jpg`, alt: 'Các thành viên gặp gỡ tại Mái ấm An Yên' },
  ];

  protected readonly volunteerGallery: readonly StoryPhoto[] = [
    { src: `${PHOTO_BASE}/volunteer-1.jpg`, alt: 'Tình nguyện viên phục vụ tại Bếp An Yên' },
    { src: `${PHOTO_BASE}/volunteer-2.jpg`, alt: 'Mọi người cùng chuẩn bị bữa ăn thiện nguyện' },
    { src: `${PHOTO_BASE}/meal.jpg`, alt: 'Suất cơm được chuẩn bị cho người bệnh' },
  ];
}
