import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-story-card-decoration',
  standalone: true,
  templateUrl: './story-card-decoration.html',
  styleUrl: './story-card-decoration.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoryCardDecoration {
  protected readonly decorations = [
    { id: 'lower-left', image: '/assets/images/stories/card-decor-lower-left.svg' },
    {
      id: 'lower-left-detail',
      image: '/assets/images/stories/card-decor-lower-left-detail.svg',
    },
    { id: 'circles', image: '/assets/images/stories/card-decor-circles.svg' },
    { id: 'bottom-center', image: '/assets/images/stories/card-decor-bottom-center.svg' },
    { id: 'right-mid', image: '/assets/images/stories/card-decor-right-mid.svg' },
    { id: 'bottom-detail', image: '/assets/images/stories/card-decor-bottom-detail.svg' },
    { id: 'right-lower', image: '/assets/images/stories/card-decor-right-lower.svg' },
    { id: 'left-hand', image: '/assets/images/stories/card-decor-left-hand.svg' },
    { id: 'right-hand', image: '/assets/images/stories/card-decor-right-hand.svg' },
    { id: 'left-leaf', image: '/assets/images/stories/card-decor-left-leaf.svg' },
    {
      id: 'left-leaf-detail',
      image: '/assets/images/stories/card-decor-left-leaf-detail.svg',
    },
  ] as const;
}
