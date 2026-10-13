import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MOCK_CONTENT_ITEMS } from '../../data/content.mock-data';
import { ContentAdminStorageService } from '../../services/content-admin-storage.service';
import { ContentListPage } from './content-list-page';

describe('ContentListPage', () => {
  let fixture: ComponentFixture<ContentListPage>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ContentListPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentListPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('renders the four Figma guide groups with published content only', () => {
    const cards = fixture.nativeElement.querySelectorAll('.content-card');

    expect(cards).toHaveLength(16);
    expect(fixture.nativeElement.querySelectorAll('.content-group')).toHaveLength(4);
    expect(fixture.nativeElement.querySelectorAll('.content-group__more')).toHaveLength(4);
    expect(fixture.nativeElement.textContent).toContain('Hiểu rõ hành trình điều trị');
    expect(fixture.nativeElement.textContent).not.toContain('Nội dung đang chờ kiểm duyệt');
  });

  it('reuses the existing filter flow from each Figma section button', async () => {
    const buttons = fixture.nativeElement.querySelectorAll(
      '.content-group__more',
    ) as NodeListOf<HTMLButtonElement>;

    buttons[1].click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.content-card')).toHaveLength(4);
    expect(fixture.nativeElement.textContent).toContain('Kết quả phù hợp');
    expect(fixture.nativeElement.querySelectorAll('.content-group__more')).toHaveLength(0);
  });

  it('limits each guide group independently when an admin publishes a new article', async () => {
    const admin = TestBed.inject(ContentAdminStorageService);
    const signGuide = MOCK_CONTENT_ITEMS.find(
      (item) => item.kind === 'GUIDE' && item.category.slug === 'dau-hieu',
    )!;
    admin.create({
      ...signGuide,
      id: 'GUIDE-ADMIN-NEW',
      slug: 'dau-hieu-admin-moi',
      title: 'Bài Dấu hiệu vừa xuất bản',
      featured: false,
      publishedAt: '2099-01-01T00:00:00.000Z',
    });

    fixture.destroy();
    fixture = TestBed.createComponent(ContentListPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const groups = [...element.querySelectorAll<HTMLElement>('.content-group')];
    const signs = groups.find((group) =>
      group.querySelector('h2')?.textContent?.includes('Dấu hiệu'),
    )!;
    const nutrition = groups.find((group) =>
      group.querySelector('h2')?.textContent?.includes('Chế độ dinh dưỡng'),
    )!;

    expect(signs.querySelectorAll('.content-card')).toHaveLength(4);
    expect(signs.textContent).toContain('Bài Dấu hiệu vừa xuất bản');
    expect(nutrition.querySelectorAll('.content-card')).toHaveLength(4);
  });

  it('shows an admin-created guide category instead of dropping it from the grouped view', async () => {
    const admin = TestBed.inject(ContentAdminStorageService);
    const guide = MOCK_CONTENT_ITEMS.find((item) => item.kind === 'GUIDE')!;
    admin.create({
      ...guide,
      id: 'GUIDE-CUSTOM-CATEGORY',
      slug: 'phuc-hoi-sau-dieu-tri',
      title: 'Phục hồi sau điều trị',
      category: { id: 'CAT-phuc-hoi', name: 'Phục hồi', slug: 'phuc-hoi' },
      featured: false,
      publishedAt: '2099-01-01T00:00:00.000Z',
    });

    fixture.destroy();
    fixture = TestBed.createComponent(ContentListPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const customGroup = [...element.querySelectorAll<HTMLElement>('.content-group')].find((group) =>
      group.querySelector('h2')?.textContent?.includes('Phục hồi'),
    );

    expect(customGroup).toBeDefined();
    expect(customGroup?.querySelectorAll('.content-card')).toHaveLength(1);
    expect(customGroup?.textContent).toContain('Phục hồi sau điều trị');
  });

  it('filters guides by search text without accents', async () => {
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'hoa tri';
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.content-card')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Hóa trị là gì và diễn ra như thế nào?');
    expect(fixture.nativeElement.textContent).toContain(
      'Những lưu ý về dinh dưỡng trong thời gian hóa trị',
    );
  });

  it('reuses the shared reveal motion for the Figma guide layout', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.content-hero__copy')?.classList).toContain('ui-reveal--left');
    expect(element.querySelector('.content-hero img')?.classList).toContain('ui-reveal--right');
    expect(element.querySelector('.content-toolbar')?.classList).toContain('ui-reveal');
    expect(
      [...element.querySelectorAll('.content-card')].every((card) =>
        card.classList.contains('ui-reveal'),
      ),
    ).toBe(true);
  });
});
