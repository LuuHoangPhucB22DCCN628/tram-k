import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { CommunityLocationPin } from '../../components/community-location-pin/community-location-pin';
import { CommunityLoveTitle } from '../../components/community-love-title/community-love-title';
import { CommunityMapBackground } from '../../components/community-map-background/community-map-background';
import {
  type DonationLocationMarker,
  HANOI_DONATION_LOCATIONS,
} from '../../data/hanoi-donation-locations.data';
import { DONATION_MAP_REGIONS } from '../../data/donation-map-regions.data';
import {
  donationLocationDirectionsUrl,
  donationMapImageForRegion,
} from '../../data/donation-location-map.utils';
import { CommunityLocationAdminStorageService } from '../../services/community-location-admin-storage.service';

@Component({
  selector: 'app-community-hanoi-donation-map-page',
  standalone: true,
  imports: [CommunityLocationPin, CommunityLoveTitle, CommunityMapBackground, RevealDirective],
  templateUrl: './community-hanoi-donation-map-page.html',
  styleUrl: './community-hanoi-donation-map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityHanoiDonationMapPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly locationStorage = inject(CommunityLocationAdminStorageService);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private previousBodyOverflow = '';
  private triggerElement: HTMLElement | null = null;
  private pendingLocationId = this.route.snapshot.queryParamMap.get('location');
  protected readonly region =
    DONATION_MAP_REGIONS.find(
      (item) => item.id === (this.route.snapshot.paramMap.get('regionId') ?? 'ha-noi'),
    ) ?? DONATION_MAP_REGIONS.find((item) => item.id === 'ha-noi')!;
  protected readonly mapImage = donationMapImageForRegion(this.region.id);

  protected readonly markers = computed(() => {
    this.locationStorage.changes();
    return this.locationStorage.active(HANOI_DONATION_LOCATIONS, this.region.id);
  });

  protected readonly selectedLocation = signal<DonationLocationMarker | null>(null);

  constructor() {
    this.locationStorage.initializePublic();
    effect(() => {
      const markers = this.markers();
      if (!this.pendingLocationId) return;
      const location = markers.find((marker) => marker.id === this.pendingLocationId);
      if (location) {
        this.pendingLocationId = null;
        queueMicrotask(() => this.openDetails(location));
      }
    });
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  protected openDetails(location: DonationLocationMarker, event?: Event): void {
    this.triggerElement = event?.currentTarget as HTMLElement | null;
    this.selectedLocation.set(location);
    this.lockBodyScroll();
    queueMicrotask(() => this.closeButton()?.nativeElement.focus());
  }

  protected closeDetails(): void {
    if (!this.selectedLocation()) return;
    this.selectedLocation.set(null);
    this.unlockBodyScroll();
    this.triggerElement?.focus();
    this.triggerElement = null;

    if (this.route.snapshot.queryParamMap.has('location')) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { location: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  protected directionsUrl(location: DonationLocationMarker): string {
    return donationLocationDirectionsUrl(location);
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    this.closeDetails();
  }

  private lockBodyScroll(): void {
    if (document.body.style.overflow === 'hidden') return;
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    document.body.style.overflow = this.previousBodyOverflow;
  }
}
