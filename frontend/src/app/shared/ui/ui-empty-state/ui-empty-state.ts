import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-empty-state',
  standalone: true,
  templateUrl: './ui-empty-state.html',
  styleUrl: './ui-empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiEmptyState {
  readonly title = input('Chưa có dữ liệu');
  readonly message = input('Nội dung sẽ xuất hiện tại đây khi có dữ liệu.');
}
