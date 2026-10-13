import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MOCK_CONTENT_ITEMS } from '@features/content/data/content.mock-data';
import { ContentAdminStorageService } from '@features/content/services/content-admin-storage.service';
import { StoriesPage } from './stories-page';

describe('StoriesPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [StoriesPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('renders the two Figma feature stories and at most four published story cards', async () => {
    const fixture = TestBed.createComponent(StoriesPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain(
      'Người phụ nữ lật ngược quân bài mang tên Ung thư',
    );
    expect(element.textContent).toContain('Bếp An Yên - cho đi là còn mãi');
    expect(element.querySelectorAll('.story-card')).toHaveLength(4);
  });

  it('keeps the four original Figma card images and reuses the shared SVG icons', async () => {
    const fixture = TestBed.createComponent(StoriesPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const titleImages = [
      ...element.querySelectorAll<HTMLImageElement>(
        '.destiny-hero__title-art, .story-feature__title-art',
      ),
    ].map((image) => image.getAttribute('src'));

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
    expect(
      [...element.querySelectorAll<HTMLImageElement>('.story-card > img')].map((image) =>
        image.getAttribute('src'),
      ),
    ).toEqual([
      '/assets/images/stories/card-4.png',
      '/assets/images/stories/card-2.png',
      '/assets/images/stories/card-7.png',
      '/assets/images/stories/card-8.png',
    ]);
  });

  it('shows a newly published admin story without exceeding four cards', async () => {
    const admin = TestBed.inject(ContentAdminStorageService);
    const story = MOCK_CONTENT_ITEMS.find((item) => item.kind === 'STORY')!;
    admin.create({
      ...story,
      id: 'STORY-ADMIN-NEW',
      slug: 'cau-chuyen-admin-moi',
      title: 'Câu chuyện admin vừa xuất bản',
      featured: false,
      publishedAt: '2099-01-01T00:00:00.000Z',
      coverImage: {
        ...story.coverImage,
        url: '/assets/images/stories/card-2.png',
        alt: 'Ảnh bài viết mới',
      },
    });

    const fixture = TestBed.createComponent(StoriesPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.story-card')).toHaveLength(4);
    expect(element.textContent).toContain('Câu chuyện admin vừa xuất bản');
    expect(
      element.querySelector('a[href="/cau-chuyen/bai-viet/cau-chuyen-admin-moi"]'),
    ).not.toBeNull();
  });

  it('reuses the shared reveal motion without duplicating animation markup', async () => {
    const fixture = TestBed.createComponent(StoriesPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-destiny-story-hero')?.classList).toContain(
      'ui-reveal--scale',
    );
    expect(element.querySelector('.story-feature__art')?.classList).toContain('ui-reveal--left');
    expect(element.querySelector('.story-feature__content')?.classList).toContain(
      'ui-reveal--right',
    );
    expect(
      [...element.querySelectorAll('.story-card')].every((card) =>
        card.classList.contains('ui-reveal'),
      ),
    ).toBe(true);
  });
});
