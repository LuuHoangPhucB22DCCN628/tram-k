import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StoriesPage } from './stories-page';

describe('StoriesPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoriesPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the two Figma feature stories and four story cards', () => {
    const fixture = TestBed.createComponent(StoriesPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain(
      'Người phụ nữ lật ngược quân bài mang tên Ung thư',
    );
    expect(element.textContent).toContain('Bếp An Yên - cho đi là còn mãi');
    expect(element.querySelectorAll('.story-card')).toHaveLength(4);
  });

  it('uses unique local content images and reuses the shared SVG icons', () => {
    const fixture = TestBed.createComponent(StoriesPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const contentImages = [
      ...element.querySelectorAll<HTMLImageElement>(
        '.destiny-hero__art, .story-feature__art, .story-card > img',
      ),
    ].map((image) => image.getAttribute('src'));
    const titleImages = [
      ...element.querySelectorAll<HTMLImageElement>(
        '.destiny-hero__title-art, .story-feature__title-art',
      ),
    ].map((image) => image.getAttribute('src'));

    expect(contentImages).toHaveLength(6);
    expect(new Set(contentImages).size).toBe(contentImages.length);
    expect(titleImages).toEqual([
      '/assets/images/stories/hero-title.svg',
      '/assets/images/stories/kitchen-title.svg',
    ]);
    expect(element.querySelector('a[href="/cau-chuyen/la-bai-dinh-menh"]')).not.toBeNull();
    expect(
      element.querySelectorAll('img[src="/assets/images/stories/arrow-light.svg"]'),
    ).toHaveLength(2);
    expect(
      element.querySelectorAll('img[src="/assets/images/stories/arrow-primary.svg"]'),
    ).toHaveLength(4);
  });
});
