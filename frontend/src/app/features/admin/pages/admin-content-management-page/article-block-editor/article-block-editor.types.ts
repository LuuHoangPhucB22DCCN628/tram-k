import type { ContentImage } from '@features/content/models/content.models';

export type EditorBlockType = 'HEADING' | 'PARAGRAPH' | 'BULLETS' | 'IMAGE';
export type EditableBlockField = 'text' | 'imageAlt' | 'imageCaption';

export interface ArticleEditorBlock {
  readonly id: string;
  readonly type: EditorBlockType;
  readonly text: string;
  readonly image: ContentImage | null;
  readonly imageAlt: string;
  readonly imageCaption: string;
}

export interface ArticleBlockFieldChange {
  readonly blockId: string;
  readonly field: EditableBlockField;
  readonly value: string;
}

export interface ArticleBlockImageSelection {
  readonly blockId: string;
  readonly file: File;
}
