import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';

import { CANCER_DETAILS } from '../../data/cancer-details.data';
import { CANCER_TYPES } from '../../data/cancer-types.data';

@Component({
  selector: 'app-cancer-type-detail-page',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './cancer-type-detail-page.html',
  styleUrl: './cancer-type-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancerTypeDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly detail = computed(() => CANCER_DETAILS[this.params().get('slug') ?? '']);
  protected readonly featuredDetails = Object.values(CANCER_DETAILS).filter(
    (item) => item.layout !== 'article',
  );
  protected readonly relatedTypes = computed(() => {
    const slug = this.params().get('slug');
    return CANCER_TYPES.filter((item) => !item.featured && item.slug !== slug).slice(0, 4);
  });
}
