import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CommunityLoveTitle } from '../../components/community-love-title/community-love-title';
import { CommunityMapBackground } from '../../components/community-map-background/community-map-background';

@Component({
  selector: 'app-community-donation-map-page',
  standalone: true,
  imports: [CommunityLoveTitle, CommunityMapBackground, RouterLink],
  templateUrl: './community-donation-map-page.html',
  styleUrl: './community-donation-map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityDonationMapPage {}
