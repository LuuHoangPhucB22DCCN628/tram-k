import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { EscapeCloseDirective } from '@shared/directives/escape-close.directive';

import type { ArticlePreviewData } from './article-preview.types';

@Component({
  selector: 'app-article-preview',
  standalone: true,
  imports: [EscapeCloseDirective],
  templateUrl: './article-preview.component.html',
  styleUrl: './article-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticlePreviewComponent {
  readonly article = input.required<ArticlePreviewData>();
  readonly closeRequested = output<void>();

  protected readonly previewDate = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  protected bulletItems(value: string): readonly string[] {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
