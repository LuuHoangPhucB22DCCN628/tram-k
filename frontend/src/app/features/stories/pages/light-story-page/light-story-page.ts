import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface LightStorySection {
  readonly src: string;
  readonly alt: string;
}

@Component({
  selector: 'app-light-story-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './light-story-page.html',
  styleUrl: './light-story-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LightStoryPage {
  protected readonly sections: readonly LightStorySection[] = [
    {
      src: '/assets/images/stories/white-story/01-hero.svg',
      alt: 'Ánh sáng - Học cách sống sau lời tuyên án',
    },
    {
      src: '/assets/images/stories/white-story/02-anh-den-dem.svg',
      alt: 'Ánh đèn đêm - Khoảnh khắc bừng tỉnh',
    },
    {
      src: '/assets/images/stories/white-story/03-nuong-tua.svg',
      alt: 'Nương tựa',
    },
    {
      src: '/assets/images/stories/white-story/04-chuong-3.svg',
      alt: 'Hành trình học cách sống sau lời tuyên án - phần ba',
    },
    {
      src: '/assets/images/stories/white-story/05-chuong-4.svg',
      alt: 'Hành trình học cách sống sau lời tuyên án - phần bốn',
    },
    {
      src: '/assets/images/stories/white-story/06-chuong-5.svg',
      alt: 'Hành trình học cách sống sau lời tuyên án - phần năm',
    },
    {
      src: '/assets/images/stories/white-story/07-chuong-6.svg',
      alt: 'Hành trình học cách sống sau lời tuyên án - phần sáu',
    },
    {
      src: '/assets/images/stories/white-story/08-gallery.svg',
      alt: 'Những hình ảnh trong hành trình của chị Trang',
    },
    {
      src: '/assets/images/stories/white-story/09-continue.svg',
      alt: 'Tiếp tục hành trình sau khi đã khám phá hai câu chuyện',
    },
  ];
}
