import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CANCER_DETAILS } from '../../data/cancer-details.data';
import { CANCER_FACTS, CANCER_TYPES } from '../../data/cancer-types.data';
import { CancerTypesPage } from './cancer-types-page';

describe('CancerTypesPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CancerTypesPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the title and exposes all Figma list data', () => {
    const fixture = TestBed.createComponent(CancerTypesPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Hiểu đúng về ung thư');
    expect(CANCER_FACTS).toHaveLength(4);
    expect(CANCER_TYPES.filter((item) => !item.featured)).toHaveLength(7);
  });

  it('renders the seven other cancer cards from the Figma section', () => {
    const fixture = TestBed.createComponent(CancerTypesPage);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.cancer-card') as NodeListOf<HTMLElement>;
    expect(cards).toHaveLength(7);
    expect([...cards].map((card) => card.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Gan'),
        expect.stringContaining('Cổ tử cung'),
      ]),
    );
    expect(
      [...cards].every((card) =>
        card.textContent?.includes('Loại ung thư có số ca mắc mới cao nhất tại Việt Nam.'),
      ),
    ).toBe(true);
    expect(fixture.nativeElement.querySelector('.other-cancers > header p')?.textContent).toContain(
      'Đằng sau mỗi hành trình được tiếp thêm sức mạnh là sự đồng hành của những đối tác',
    );
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
});
