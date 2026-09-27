import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-community-love-title',
  standalone: true,
  templateUrl: './community-love-title.html',
  styleUrl: './community-love-title.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityLoveTitle {}
