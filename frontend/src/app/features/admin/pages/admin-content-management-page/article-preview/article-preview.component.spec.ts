import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArticlePreviewComponent } from './article-preview.component';

describe('ArticlePreviewComponent', () => {
  let fixture: ComponentFixture<ArticlePreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticlePreviewComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ArticlePreviewComponent);
    fixture.componentRef.setInput('article', {
      title: 'Một bài viết mẫu',
      excerpt: 'Phần tóm tắt giúp độc giả hiểu nhanh nội dung.',
      categoryName: 'Câu chuyện',
      authorName: 'Ban biên tập Trạm K',
      readingMinutes: 3,
      coverImage: null,
      blocks: [
        {
          id: 'heading',
          type: 'HEADING',
          text: 'Khởi đầu mới',
          image: null,
          imageAlt: '',
          imageCaption: '',
        },
        {
          id: 'list',
          type: 'BULLETS',
          text: 'Điều thứ nhất\nĐiều thứ hai',
          image: null,
          imageAlt: '',
          imageCaption: '',
        },
      ],
    });
    fixture.detectChanges();
  });

  it('renders article headings, metadata and bullet items', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Một bài viết mẫu');
    expect(element.querySelector('h2')?.textContent).toContain('Khởi đầu mới');
    expect(element.querySelectorAll('li')).toHaveLength(2);
    expect(element.textContent).toContain('3 phút đọc');
  });

  it('requests close from the toolbar button', () => {
    const listener = vi.fn();
    fixture.componentInstance.closeRequested.subscribe(listener);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')?.click();
    expect(listener).toHaveBeenCalledOnce();
  });
});
