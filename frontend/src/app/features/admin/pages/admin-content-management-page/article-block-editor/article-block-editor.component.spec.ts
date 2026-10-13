import { TestBed } from '@angular/core/testing';

import { ArticleBlockEditorComponent } from './article-block-editor.component';
import type { ArticleEditorBlock, EditorBlockType } from './article-block-editor.types';

describe('ArticleBlockEditorComponent', () => {
  const blocks: readonly ArticleEditorBlock[] = [
    {
      id: 'block-1',
      type: 'HEADING',
      text: 'Chuẩn bị trước điều trị',
      image: null,
      imageAlt: '',
      imageCaption: '',
    },
    {
      id: 'block-2',
      type: 'PARAGRAPH',
      text: 'Nội dung hướng dẫn người bệnh.',
      image: null,
      imageAlt: '',
      imageCaption: '',
    },
  ];

  it('renders blocks and emits add and reorder actions', async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleBlockEditorComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(ArticleBlockEditorComponent);
    fixture.componentRef.setInput('blocks', blocks);
    fixture.componentRef.setInput('errors', {});
    fixture.detectChanges();

    const added: EditorBlockType[] = [];
    const moved: Array<{ blockId: string; direction: -1 | 1 }> = [];
    fixture.componentInstance.addRequested.subscribe((type) => added.push(type));
    fixture.componentInstance.moveRequested.subscribe((event) => moved.push(event));

    const host = fixture.nativeElement as HTMLElement;
    const addImageButton = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Hình ảnh'),
    )!;
    addImageButton.click();
    host.querySelectorAll<HTMLButtonElement>('[aria-label="Di chuyển khối lên"]')[1].click();

    expect(host.querySelectorAll('article')).toHaveLength(2);
    expect(added).toEqual(['IMAGE']);
    expect(moved).toEqual([{ blockId: 'block-2', direction: -1 }]);
  });

  it('emits edited paragraph content without owning persistence logic', async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleBlockEditorComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(ArticleBlockEditorComponent);
    fixture.componentRef.setInput('blocks', blocks);
    fixture.componentRef.setInput('errors', {});
    fixture.detectChanges();

    const changes: unknown[] = [];
    fixture.componentInstance.fieldChanged.subscribe((event) => changes.push(event));
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Nội dung đã cập nhật.';
    textarea.dispatchEvent(new Event('input'));

    expect(changes).toEqual([
      { blockId: 'block-2', field: 'text', value: 'Nội dung đã cập nhật.' },
    ]);
  });
});
