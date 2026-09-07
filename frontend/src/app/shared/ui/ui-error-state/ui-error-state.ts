import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-ui-error-state',
  standalone: true,
  templateUrl: './ui-error-state.html',
  styleUrl: './ui-error-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiErrorState {
  readonly title = input('Không thể tải dữ liệu');
  readonly message = input('Đã xảy ra lỗi. Vui lòng thử lại sau.');
  readonly retry = output<void>();
}
