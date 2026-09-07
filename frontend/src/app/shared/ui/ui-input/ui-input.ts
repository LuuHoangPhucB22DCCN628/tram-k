import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

export type UiInputType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';

@Component({
  selector: 'app-ui-input',
  standalone: true,
  templateUrl: './ui-input.html',
  styleUrl: './ui-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiInput {
  private static nextId = 0;

  readonly label = input.required<string>();
  readonly type = input<UiInputType>('text');
  readonly placeholder = input('');
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly autocomplete = input<string | null>(null);
  readonly value = model(''); // Hỗ trợ [(value)] hoặc [value] kết hợp (valueChange).

  protected readonly inputId = `ui-input-${UiInput.nextId++}`;
  protected readonly describedBy = computed(() => {
    if (this.error()) return `${this.inputId}-error`;
    if (this.hint()) return `${this.inputId}-hint`;
    return null;
  });

  protected updateValue(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
