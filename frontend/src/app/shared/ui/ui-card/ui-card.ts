import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-ui-card',
  standalone: true,
  templateUrl: './ui-card.html',
  styleUrl: './ui-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiCard {}
