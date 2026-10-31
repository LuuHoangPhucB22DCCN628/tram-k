import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { UiModal } from '../../../../shared/ui/ui-modal/ui-modal';
import { CommunityLoveTitle } from '../../components/community-love-title/community-love-title';
import { CommunityMapBackground } from '../../components/community-map-background/community-map-background';
import { type DonationMapRegion, DONATION_MAP_REGIONS } from '../../data/donation-map-regions.data';
import { HANOI_DONATION_LOCATIONS } from '../../data/hanoi-donation-locations.data';
import { donationMapImageForRegion } from '../../data/donation-location-map.utils';
import { CommunityLocationAdminStorageService } from '../../services/community-location-admin-storage.service';

interface DonationMapRegionView extends DonationMapRegion {
  readonly detailRoute: string;
  readonly locationCount: number;
}

@Component({
  selector: 'app-community-donation-map-page',
  standalone: true,
  imports: [CommunityLoveTitle, CommunityMapBackground, RouterLink, RevealDirective, UiModal],
  templateUrl: './community-donation-map-page.html',
  styleUrl: './community-donation-map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityDonationMapPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly locationStorage = inject(CommunityLocationAdminStorageService);
  private triggerRegion: SVGElement | null = null;

  protected readonly regions = computed<readonly DonationMapRegionView[]>(() => {
    this.locationStorage.changes();
    const counts = new Map<string, number>();
    for (const location of this.locationStorage.active(HANOI_DONATION_LOCATIONS)) {
      counts.set(location.regionId, (counts.get(location.regionId) ?? 0) + 1);
    }

    return DONATION_MAP_REGIONS.map((region) => {
      const locationCount = counts.get(region.id) ?? 0;
      return {
        ...region,
        locationCount,
        detailRoute: `/cong-dong/diem-quyen-gop/${region.id}`,
      };
    });
  });
  private readonly selectedRegionId = signal<string | null>(null);
  protected readonly selectedRegion = computed(
    () => this.regions().find((region) => region.id === this.selectedRegionId()) ?? null,
  );
  protected readonly mapImageForRegion = donationMapImageForRegion;
  constructor() {
    this.locationStorage.initializePublic();
    const requestedRegion = this.route.snapshot.queryParamMap.get('region');
    const region = this.regions().find((item) => item.id === requestedRegion);
    if (region) this.selectedRegionId.set(region.id);
  }

  protected selectRegion(region: DonationMapRegionView, event?: Event): void {
    event?.preventDefault();
    const eventTarget = event?.currentTarget as SVGElement | null;
    this.triggerRegion =
      (eventTarget?.closest('.donation-map-hero__region') as SVGElement | null) ?? eventTarget;
    this.selectedRegionId.set(region.id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { region: region.id },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
    });
  }

  protected closeRegion(): void {
    if (!this.selectedRegion()) return;
    this.selectedRegionId.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { region: null },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
    });
    queueMicrotask(() => this.triggerRegion?.focus());
  }
}
