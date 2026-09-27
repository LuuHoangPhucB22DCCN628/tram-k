import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DestinyStoryHero } from '../../components/destiny-story-hero/destiny-story-hero';

interface StoryCard {
  readonly image: string;
  readonly title: string;
  readonly description: string;
}

@Component({
  selector: 'app-stories-page',
  standalone: true,
  imports: [DestinyStoryHero],
  templateUrl: './stories-page.html',
  styleUrl: './stories-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoriesPage {
  protected readonly stories: readonly StoryCard[] = [
    {
      image: '/assets/images/stories/card-4.png',
      title: "Những chia sẻ từ hành trình vượt qua 'cửa tử' ung thư...",
      description:
        'Câu chuyện về những người bệnh lựa chọn sống tích cực và tìm thấy niềm vui từ những điều bình dị nhất.',
    },
    {
      image: '/assets/images/stories/card-2.png',
      title: "Một năm chống chọi với 'cuộc chiến ung thư'",
      description:
        'Căn bệnh ung thư hạch bạch huyết (Lymphoma) đến quá sớm với Nguyễn Phương Thảo (2002), ngay khi cô 22 tuổi.',
    },
    {
      image: '/assets/images/stories/card-7.png',
      title: 'Câu chuyện nghị lực của những người chung sống bình yên...',
      description:
        'Những tiến bộ trong điều trị bệnh ung thư các năm gần đây thêm một lần nữa khẳng định ung thư không phải là dấu chấm hết.',
    },
    {
      image: '/assets/images/stories/card-8.png',
      title: 'Cảm động với bức thư truyền cảm hứng từ một bệnh nhân ung thư',
      description:
        'Trong thư, người bệnh bày tỏ nỗi lo âu và hoang mang khi đối diện với căn bệnh hiểm nghèo. Nhưng chính tại Khoa Ung Bướu, họ đã tìm thấy sự an ủi và động lực.',
    },
  ];

  protected scrollToStories(): void {
    document.querySelector('#story-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
