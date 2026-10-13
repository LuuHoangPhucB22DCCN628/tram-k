import type { ContentImage } from '@features/content/models/content.models';

import type { ArticleEditorBlock } from '../article-block-editor/article-block-editor.types';

export interface ArticlePreviewData {
  readonly title: string;
  readonly excerpt: string;
  readonly categoryName: string;
  readonly authorName: string;
  readonly readingMinutes: number;
  readonly coverImage: ContentImage | null;
  readonly blocks: readonly ArticleEditorBlock[];
}
