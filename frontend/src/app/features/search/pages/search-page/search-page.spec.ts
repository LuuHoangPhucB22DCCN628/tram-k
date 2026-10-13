import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import type { SearchResultItem } from '../../models/search.models';
import { SiteSearchService } from '../../services/site-search.service';
import { SearchPage } from './search-page';

describe('SearchPage', () => {
  const results: readonly SearchResultItem[] = Array.from({ length: 9 }, (_, index) => ({
    id: `RESULT-${index}`,
    type: index % 3 === 0 ? 'PODCAST' : 'GUIDE',
    title: `Kết quả ung thư ${index + 1}`,
    description: 'Nội dung mẫu giúp người dùng tìm đúng thông tin cần thiết.',
    eyebrow: index % 3 === 0 ? 'Podcast' : 'Cẩm nang',
    metadata: 'Trạm K',
    image: '/assets/images/mental-health/podcast-yoga.png',
    imageAlt: 'Ảnh nội dung mẫu',
    link: index % 3 === 0 ? '/goc-tam-ly' : '/cam-nang/noi-dung-mau',
    queryParams: index % 3 === 0 ? { podcast: `RESULT-${index}` } : undefined,
    publishedAt: `2026-10-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    score: 60,
  }));
  const searchService = { search: vi.fn(() => of(results)) };

  beforeEach(async () => {
    searchService.search.mockClear();
    await TestBed.configureTestingModule({
      imports: [SearchPage],
      providers: [provideRouter([]), { provide: SiteSearchService, useValue: searchService }],
    }).compileComponents();
  });

  it('shows discovery links before a keyword is submitted', () => {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.search-discovery__grid a')).toHaveLength(4);
    expect(element.querySelectorAll('.search-result-card')).toHaveLength(0);
    expect(searchService.search).not.toHaveBeenCalled();
  });

  it('loads a URL keyword, shows eight results per page and filters without a second search', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?q=ung%20thu');
    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(searchService.search).toHaveBeenCalledWith('ung thu');
    expect(element.querySelectorAll('.search-result-card')).toHaveLength(8);
    expect(element.textContent).toContain('Tìm thấy 9 kết quả');
    expect(element.querySelector('button[aria-label="Trang 2"]')).not.toBeNull();

    const podcastFilter = [
      ...element.querySelectorAll<HTMLButtonElement>('.search-filters button'),
    ].find((button) => button.textContent?.includes('Podcast'))!;
    podcastFilter.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelectorAll('.search-result-card')).toHaveLength(3);
    expect(searchService.search).toHaveBeenCalledTimes(1);
  });

  it('validates a one-character keyword before changing the URL', () => {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('#site-search-input')!;
    input.value = 'u';
    input.dispatchEvent(new Event('input'));
    element.querySelector<HTMLFormElement>('.search-box')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(element.textContent).toContain('Vui lòng nhập ít nhất 2 ký tự');
    expect(searchService.search).not.toHaveBeenCalled();
  });
});
