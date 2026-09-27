import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CommunityLocationPin } from '../../components/community-location-pin/community-location-pin';
import { CommunityLoveTitle } from '../../components/community-love-title/community-love-title';
import { CommunityMapBackground } from '../../components/community-map-background/community-map-background';

interface DonationLocationMarker {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'app-community-hanoi-donation-map-page',
  standalone: true,
  imports: [CommunityLocationPin, CommunityLoveTitle, CommunityMapBackground],
  templateUrl: './community-hanoi-donation-map-page.html',
  styleUrl: './community-hanoi-donation-map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityHanoiDonationMapPage {
  protected readonly markers: readonly DonationLocationMarker[] = [
    { id: 'south-west', label: 'Điểm quyên góp số 1 tại Hà Nội' },
    { id: 'center', label: 'Điểm quyên góp số 2 tại Hà Nội' },
    { id: 'north-east', label: 'Điểm quyên góp số 3 tại Hà Nội' },
  ];
}
