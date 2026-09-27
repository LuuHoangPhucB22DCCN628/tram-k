import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { CANCER_DETAILS } from '../../data/cancer-details.data';
import { CancerTypeDetailPage } from './cancer-type-detail-page';

describe('CancerTypeDetailPage', () => {
  let fixture: ComponentFixture<CancerTypeDetailPage>;
  let routeParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    const paramMap = convertToParamMap({ slug: 'ung-thu-vu' });
    routeParams = new BehaviorSubject(paramMap);

    await TestBed.configureTestingModule({
      imports: [CancerTypeDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: routeParams.asObservable(), snapshot: { paramMap } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CancerTypeDetailPage);
    fixture.detectChanges();
  });

  it('renders the Figma-based breast cancer detail content', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Ung thư vú');
    expect(element.querySelectorAll('.breast-section__copy ul li')).toHaveLength(4);
    expect(element.querySelectorAll('.breast-section')).toHaveLength(4);
    expect(element.querySelectorAll('.detail-section')).toHaveLength(0);
    expect(element.querySelector('.breast-screening h2')?.textContent).toContain('“chìa khóa”');
    expect(element.querySelector('.breast-story h2')?.textContent).toContain('một mình');
    expect(element.querySelectorAll('.breast-story')).toHaveLength(1);
    expect(element.querySelectorAll('.breast-story__portrait img')).toHaveLength(1);
    expect(element.querySelector('.breast-section__stages-image')?.getAttribute('src')).toBe(
      '/assets/images/cancer-types/details/breast/stages.svg',
    );
    expect(element.querySelector('.breast-hero img')?.getAttribute('src')).toBe(
      '/assets/images/cancer-types/details/breast/hero.svg',
    );
    expect(element.querySelector('.breast-story__outro-art')?.getAttribute('src')).toBe(
      '/assets/images/cancer-types/details/breast/story-outro.svg',
    );
    expect(element.querySelectorAll('.breast-story__outro img')).toHaveLength(1);
    const decor = [...element.querySelectorAll<HTMLImageElement>('.breast-page__decor img')];
    expect(decor).toHaveLength(5);
    expect(new Set(decor.map((image) => image.getAttribute('src')))).toEqual(
      new Set([
        '/assets/images/cancer-types/details/breast/page-decor-left.svg',
        '/assets/images/cancer-types/details/breast/page-decor-right.svg',
      ]),
    );
    expect(decor.every((image) => image.alt === '')).toBe(true);
  });

  it('keeps every article detail on the shared four-section Figma layout', () => {
    const articleDetails = Object.values(CANCER_DETAILS).filter(
      (detail) => detail.layout === 'article',
    );

    expect(articleDetails.length).toBeGreaterThan(0);

    for (const detail of articleDetails) {
      expect(detail.articleTitle).toBeTruthy();
      expect(detail.articleSections).toHaveLength(4);
      expect(detail.heroImage).toMatch(/^\/assets\/images\/cancer-types\//);
    }
  });

  it('renders the thyroid banner copy and bold article labels without duplicate ids', () => {
    routeParams.next(convertToParamMap({ slug: 'ung-thu-tuyen-giap' }));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const hero = element.querySelector('.thyroid-hero');
    const ids = [...element.querySelectorAll<HTMLElement>('[id]')].map((node) => node.id);

    expect(hero?.querySelector('h1')?.textContent?.trim()).toBe('Ung thư tuyến giáp');
    expect(hero?.querySelector('p')?.textContent?.trim()).toBe(
      'Hiểu bệnh, hiểu mình, hiểu hành trình phía trước',
    );
    expect(hero?.querySelector('.visually-hidden')).toBeNull();
    expect(element.querySelectorAll('.breast-section__copy strong')).toHaveLength(18);
    expect(element.querySelector('.thyroid-treatment__card')).not.toBeNull();
    expect(ids).toHaveLength(new Set(ids).size);
  });
});
