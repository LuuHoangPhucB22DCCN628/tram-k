import type { ContentImage } from '../models/content.models';

export const DEFAULT_EDITOR_COVER_IMAGE: ContentImage = {
  url: '/assets/images/cancer-types/common-cancers-figma.png',
  alt: 'Ảnh đại diện mặc định của Trạm K',
  width: 800,
  height: 500,
};

export function isDefaultEditorCover(image: ContentImage | null | undefined): boolean {
  return (
    image?.url === DEFAULT_EDITOR_COVER_IMAGE.url && image.alt === DEFAULT_EDITOR_COVER_IMAGE.alt
  );
}
