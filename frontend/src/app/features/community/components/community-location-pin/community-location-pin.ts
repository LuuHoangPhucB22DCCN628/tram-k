import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-community-location-pin',
  standalone: true,
  templateUrl: './community-location-pin.html',
  styleUrl: './community-location-pin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityLocationPin {}
