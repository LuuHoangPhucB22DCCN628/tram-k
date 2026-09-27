import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { StoryCardDecoration } from '../../components/story-card-decoration/story-card-decoration';

@Component({
  selector: 'app-dark-story-page',
  standalone: true,
  imports: [RouterLink, StoryCardDecoration],
  templateUrl: './dark-story-page.html',
  styleUrl: './dark-story-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DarkStoryPage {}
