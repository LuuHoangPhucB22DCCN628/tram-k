import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RevealDirective } from '../../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-kitchen-story-hero',
  standalone: true,
  imports: [RouterLink, RevealDirective],
  templateUrl: './kitchen-story-hero.html',
  styleUrl: './kitchen-story-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitchenStoryHero {
  @Input() showCta = true;
}
