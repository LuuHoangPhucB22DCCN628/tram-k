import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type {
  ArticleBlockFieldChange,
  ArticleBlockImageSelection,
  ArticleEditorBlock,
  EditableBlockField,
  EditorBlockType,
} from './article-block-editor.types';

@Component({
  selector: 'app-article-block-editor',
  standalone: true,
  templateUrl: './article-block-editor.component.html',
  styleUrl: './article-block-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleBlockEditorComponent {
  readonly blocks = input.required<readonly ArticleEditorBlock[]>();
  readonly errors = input.required<Readonly<Record<string, string>>>();
  readonly addRequested = output<EditorBlockType>();
  readonly fieldChanged = output<ArticleBlockFieldChange>();
  readonly moveRequested = output<{ blockId: string; direction: -1 | 1 }>();
  readonly removeRequested = output<string>();
  readonly imageSelected = output<ArticleBlockImageSelection>();
  readonly imageRemoved = output<string>();

  protected blockTypeLabel(type: EditorBlockType): string {
    return {
      HEADING: 'Tiêu đề phụ',
      PARAGRAPH: 'Đoạn văn',
      BULLETS: 'Danh sách',
      IMAGE: 'Hình ảnh',
    }[type];
  }

  protected changeField(blockId: string, field: EditableBlockField, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.fieldChanged.emit({ blockId, field, value });
  }

  protected chooseImage(blockId: string, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    if (file) this.imageSelected.emit({ blockId, file });
    inputElement.value = '';
  }
}
