import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MOCK_CONTENT_ITEMS } from '../../../content/data/content.mock-data';
import { ContentAdminStorageService } from '../../../content/services/content-admin-storage.service';
import { CANCER_DETAILS } from '../../data/cancer-details.data';
import { CANCER_FACTS, CANCER_TYPES } from '../../data/cancer-types.data';
import { CancerTypesPage } from './cancer-types-page';

describe('CancerTypesPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CancerTypesPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('renders the title and exposes all Figma list data', () => {
    const fixture = TestBed.createComponent(CancerTypesPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Hiểu đúng về ung thư');
    expect(CANCER_FACTS).toHaveLength(4);
    expect(CANCER_TYPES.filter((item) => !item.featured)).toHaveLength(7);
  });

  it('renders all seven Figma cards in the original four-plus-three layout', async () => {
    const fixture = TestBed.createComponent(CancerTypesPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const cards = element.querySelectorAll('.cancer-card');
    expect(cards).toHaveLength(7);
    expect([...cards].map((card) => card.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Cổ tử cung'),
        expect.stringContaining('Đại trực tràng'),
        expect.stringContaining('Vòm họng'),
      ]),
    );
    expect(
      [...element.querySelectorAll<HTMLImageElement>('.cancer-card > img')].every((image) =>
        image.src.includes('/assets/images/cancer-types/'),
      ),
    ).toBe(true);
    expect(fixture.nativeElement.querySelector('.other-cancers > header p')?.textContent).toContain(
      'Đằng sau mỗi hành trình được tiếp thêm sức mạnh là sự đồng hành của những đối tác',
    );
  });

  it('shows a newly published admin cancer article only in the cancer section', async () => {
    const admin = TestBed.inject(ContentAdminStorageService);
    const cancer = MOCK_CONTENT_ITEMS.find((item) => item.kind === 'CANCER_TYPE')!;
    admin.create({
      ...cancer,
      id: 'CANCER-ADMIN-NEW',
      slug: 'ung-thu-admin-moi',
      title: 'Bài ung thư admin vừa xuất bản',
      featured: false,
      publishedAt: '2099-01-01T00:00:00.000Z',
      coverImage: {
        ...cancer.coverImage,
        url: '/assets/images/cancer-types/liver.png',
        alt: 'Minh họa bài ung thư mới',
      },
    });

    const fixture = TestBed.createComponent(CancerTypesPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.cancer-card')).toHaveLength(7);
    expect(element.textContent).toContain('Bài ung thư admin vừa xuất bản');
    expect(
      element.querySelector('a[href="/loai-ung-thu/bai-viet/ung-thu-admin-moi"]'),
    ).not.toBeNull();
  });

  it('keeps every list item connected to one unique detail page', () => {
    const slugs = CANCER_TYPES.map((item) => item.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(Object.keys(CANCER_DETAILS)).toHaveLength(CANCER_TYPES.length);

    for (const item of CANCER_TYPES) {
      expect(CANCER_DETAILS[item.slug]?.slug).toBe(item.slug);
      expect(item.image).toMatch(/^\/assets\/images\/cancer-types\//);
    }
  });

  it('scrolls to the cancer cards without leaving the list page', () => {
    const fixture = TestBed.createComponent(CancerTypesPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const section = element.querySelector('#cancer-types') as HTMLElement;
    const links = element.querySelectorAll<HTMLAnchorElement>(
      'a[href="/loai-ung-thu#cancer-types"]',
    );
    let scrollCount = 0;
    section.scrollIntoView = () => {
      scrollCount += 1;
    };

    expect(links).toHaveLength(1);
    for (const link of links) {
      const click = new MouseEvent('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(true);
    }
    expect(scrollCount).toBe(1);
  });

  it('opens the featured three-cancer detail flow from its CTA', () => {
    const fixture = TestBed.createComponent(CancerTypesPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector<HTMLAnchorElement>('.featured-cancers__button');
    expect(link?.getAttribute('href')).toBe('/loai-ung-thu/ung-thu-vu');
    expect(link?.textContent).toContain('Khám phá 3 loại ung thư');
  });

  it('uses the shared reveal motion for the Figma sections and cards', async () => {
    const fixture = TestBed.createComponent(CancerTypesPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.cancer-hero__copy')?.classList).toContain('ui-reveal--left');
    expect(element.querySelector('.cancer-hero > img')?.classList).toContain('ui-reveal--right');
    expect(element.querySelector('.featured-cancers__visual')?.classList).toContain(
      'ui-reveal--left',
    );
    expect(
      [...element.querySelectorAll('.fact-card, .cancer-card')].every((card) =>
        card.classList.contains('ui-reveal'),
      ),
    ).toBe(true);
  });
});
