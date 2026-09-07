import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type UiButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  templateUrl: './ui-button.html',
  styleUrl: './ui-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiButton {
  readonly variant = input<UiButtonVariant>('primary'); // Chọn kiểu hiển thị của nút.
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly accessibleLabel = input<string | null>(null);
  readonly buttonClick = output<void>(); // Màn hình cha lắng nghe bằng (buttonClick).

  protected handleClick(): void {
    if (!this.disabled() && !this.loading()) {
      this.buttonClick.emit();
    }
  }
}
