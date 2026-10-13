import { Directive, HostListener, output } from '@angular/core';

@Directive({
  selector: '[appEscapeClose]',
  standalone: true,
})
export class EscapeCloseDirective {
  readonly escapeClose = output<void>();

  @HostListener('document:keydown.escape')
  protected closeFromKeyboard(): void {
    this.escapeClose.emit();
  }
}
