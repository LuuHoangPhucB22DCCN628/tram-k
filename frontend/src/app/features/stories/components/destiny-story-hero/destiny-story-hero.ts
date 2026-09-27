import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-destiny-story-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './destiny-story-hero.html',
  styleUrl: './destiny-story-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DestinyStoryHero {
  readonly showCta = input(false);
}
