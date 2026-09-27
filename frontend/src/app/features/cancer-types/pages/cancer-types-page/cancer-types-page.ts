import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SOCIAL_LINKS } from '../../../../core/config/social-links';
import { CANCER_FACTS, CANCER_TYPES } from '../../data/cancer-types.data';

@Component({
  selector: 'app-cancer-types-page',
  imports: [RouterLink],
  templateUrl: './cancer-types-page.html',
  styleUrl: './cancer-types-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancerTypesPage {
  protected readonly facts = CANCER_FACTS;
  protected readonly otherTypes = CANCER_TYPES.filter((item) => !item.featured);
  protected readonly socialLinks = SOCIAL_LINKS;

  protected scrollToCancerTypes(event: MouseEvent): void {
    event.preventDefault();
    document.getElementById('cancer-types')?.scrollIntoView({ behavior: 'smooth' });
  }
}
