import { DOCUMENT } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  inject,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-ui-modal',
  standalone: true,
  templateUrl: './ui-modal.html',
  styleUrl: './ui-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiModal implements AfterViewChecked, OnDestroy {
  private static nextId = 0;
  private readonly document = inject(DOCUMENT);

  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;
  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;

  readonly open = input(false);
  readonly title = input.required<string>();
  readonly size = input<'md' | 'lg'>('md');
  readonly closeOnBackdrop = input(true);
  readonly closed = output<void>(); // Component cha tự quyết định cập nhật trạng thái đóng.
  protected readonly titleId = `ui-modal-title-${UiModal.nextId++}`;
  private focusInitialized = false;
  private previouslyFocused?: HTMLElement;

  ngAfterViewChecked(): void {
    if (this.open() && this.dialog && !this.focusInitialized) {
      this.previouslyFocused =
        this.document.activeElement instanceof HTMLElement
          ? this.document.activeElement
          : undefined;
      this.focusInitialized = true;
      queueMicrotask(() => {
        if (this.open()) this.closeButton?.nativeElement.focus();
      });
    } else if (!this.open() && this.focusInitialized) {
      this.restoreFocus();
    }
  }

  ngOnDestroy(): void {
    this.restoreFocus();
  }

  @HostListener('document:keydown', ['$event'])
  protected handleKeyboard(event: KeyboardEvent): void {
    if (!this.open()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closed.emit();
      return;
    }

    if (event.key === 'Tab') this.keepFocusInside(event);
  }

  protected close(): void {
    this.closed.emit();
  }

  protected handleBackdrop(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  private keepFocusInside(event: KeyboardEvent): void {
    const dialog = this.dialog?.nativeElement;
    if (!dialog) return;

    const focusableElements = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusableElements[0];
    const last = focusableElements.at(-1);

    if (!first || !last) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const activeElement = this.document.activeElement;
    if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  private restoreFocus(): void {
    if (!this.focusInitialized) return;
    const target = this.previouslyFocused;
    this.focusInitialized = false;
    this.previouslyFocused = undefined;
    if (target?.isConnected) target.focus();
  }
}
