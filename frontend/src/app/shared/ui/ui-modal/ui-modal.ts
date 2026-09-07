import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-ui-modal',
  standalone: true,
  templateUrl: './ui-modal.html',
  styleUrl: './ui-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiModal {
  private static nextId = 0;

  readonly open = input(false);
  readonly title = input.required<string>();
  readonly closeOnBackdrop = input(true);
  readonly closed = output<void>(); // Component cha tự quyết định cập nhật trạng thái đóng.
  protected readonly titleId = `ui-modal-title-${UiModal.nextId++}`;

  @HostListener('document:keydown.escape')
  protected closeFromKeyboard(): void {
    if (this.open()) this.closed.emit();
  }

  protected close(): void {
    this.closed.emit();
  }

  protected handleBackdrop(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
