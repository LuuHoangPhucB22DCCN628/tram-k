import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-loading',
  standalone: true,
  templateUrl: './ui-loading.html',
  styleUrl: './ui-loading.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiLoading {
  readonly label = input('Đang tải dữ liệu...');
}
