import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type UiBadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-ui-badge',
  standalone: true,
  templateUrl: './ui-badge.html',
  styleUrl: './ui-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiBadge {
  readonly variant = input<UiBadgeVariant>('neutral');
}
