import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';

import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { CommunityLocationPin } from '../../components/community-location-pin/community-location-pin';
import { CommunityLoveTitle } from '../../components/community-love-title/community-love-title';
import { CommunityMapBackground } from '../../components/community-map-background/community-map-background';
import {
  type DonationLocationMarker,
  HANOI_DONATION_LOCATIONS,
} from '../../data/hanoi-donation-locations.data';
import { DONATION_MAP_REGIONS } from '../../data/donation-map-regions.data';
import { CommunityMealRegistrationService } from '../../services/community-meal-registration.service';
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
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly registrations = inject(CommunityMealRegistrationService);
  private readonly locationStorage = inject(CommunityLocationAdminStorageService);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private previousBodyOverflow = '';
  private triggerElement: HTMLElement | null = null;
  protected readonly region =
    DONATION_MAP_REGIONS.find(
      (item) => item.id === (this.route.snapshot.paramMap.get('regionId') ?? 'ha-noi'),
    ) ?? DONATION_MAP_REGIONS.find((item) => item.id === 'ha-noi')!;
  protected readonly mapImage =
    this.region.id === 'ha-noi'
      ? '/assets/images/community/community-hanoi-map.svg'
      : '/assets/images/community/community-donation-map.svg';

  protected readonly markers = computed(() => {
    this.locationStorage.changes();
    return this.locationStorage.active(HANOI_DONATION_LOCATIONS, this.region.id);
  });

  protected readonly selectedLocation = signal<DonationLocationMarker | null>(null);
  protected readonly registrationFeedback = signal('');
  protected readonly isRegistered = computed(() => {
    const location = this.selectedLocation();
    const user = this.auth.currentUser();
    return !!location && !!user && this.registrations.isRegistered(location.id, user.id);
  });

  constructor() {
    const requestedLocation = this.route.snapshot.queryParamMap.get('location');
    const location = this.markers().find((marker) => marker.id === requestedLocation);
    if (location) queueMicrotask(() => this.openDetails(location));
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  protected openDetails(location: DonationLocationMarker, event?: Event): void {
    this.triggerElement = event?.currentTarget as HTMLElement | null;
    this.selectedLocation.set(location);
    this.registrationFeedback.set('');
    this.lockBodyScroll();
    queueMicrotask(() => this.closeButton()?.nativeElement.focus());
  }

  protected closeDetails(): void {
    if (!this.selectedLocation()) return;
    this.selectedLocation.set(null);
    this.registrationFeedback.set('');
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

  protected registerForMeal(): void {
    const location = this.selectedLocation();
    if (!location) return;

    const user = this.auth.currentUser();
    if (!user) {
      const returnUrl = this.router
        .createUrlTree(['/cong-dong/diem-quyen-gop', this.region.id], {
          queryParams: { location: location.id },
        })
        .toString();
      this.unlockBodyScroll();
      void this.router.navigate(['/dang-nhap'], { queryParams: { returnUrl } });
      return;
    }

    if (!this.auth.hasRole(['PATIENT', 'CARER'])) {
      this.registrationFeedback.set('Chỉ tài khoản thành viên mới có thể đăng ký nhận suất cơm.');
      return;
    }

    const created = this.registrations.register(location.id, user.id);
    this.registrationFeedback.set(
      created
        ? 'Đăng ký thành công. Trạm K sẽ liên hệ xác nhận trước buổi phát cơm.'
        : 'Bạn đã đăng ký tại địa điểm này.',
    );
  }

  protected registrationButtonLabel(): string {
    if (!this.auth.isAuthenticated()) return 'Đăng nhập để đăng ký';
    return this.isRegistered() ? 'Đã đăng ký' : 'Đăng ký nhận suất cơm';
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
