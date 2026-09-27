import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-community-map-background',
  standalone: true,
  templateUrl: './community-map-background.html',
  styleUrl: './community-map-background.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityMapBackground {}
