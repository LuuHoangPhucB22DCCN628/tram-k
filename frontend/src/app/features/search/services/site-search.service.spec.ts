import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, type Observable } from 'rxjs';

import { CharityProgramStorageService } from '@features/account/services/charity-program-storage.service';
import { ContentService } from '@features/content/services/content.service';
import { PublishedPodcastService } from '@features/mental-health/services/published-podcast.service';

import type { SearchResultItem } from '../models/search.models';
import { SiteSearchService } from './site-search.service';
import { SiteSearchApiService } from './site-search-api.service';

describe('SiteSearchService', () => {
  const guide = {
    id: 'GUIDE-SEARCH',
    kind: 'GUIDE' as const,
    slug: 'dinh-duong-ung-thu',
    title: 'Dinh dưỡng cho bệnh nhân ung thư',
    excerpt: 'Gợi ý bữa ăn dễ áp dụng trong thời gian điều trị.',
    category: { id: 'CAT-1', name: 'Dinh dưỡng', slug: 'dinh-duong' },
    tags: [{ name: 'Ung thư', slug: 'ung-thu' }],
    coverImage: { url: '/guide.png', alt: 'Bữa ăn', width: 640, height: 420 },
    publishedAt: '2026-10-01T00:00:00.000Z',
    readingMinutes: 5,
    featured: false,
  };
  const content = {
    list: vi.fn(({ kind }: { kind?: string }) =>
      of({
        items: kind === 'GUIDE' ? [guide] : [],
        page: 1,
        pageSize: 16,
        totalItems: kind === 'GUIDE' ? 1 : 0,
        totalPages: kind === 'GUIDE' ? 1 : 0,
      }),
    ),
  };
  const podcasts = {
    items: vi.fn(() => [
      {
        id: 'PODCAST-SEARCH',
        title: 'Bình tâm khi điều trị ung thư',
        description: 'Một bài thực hành thở ngắn.',
        source: 'Trạm K',
        image: '/podcast.png',
        imageAlt: 'Ảnh podcast',
        publishedAt: '2026-10-02T00:00:00.000Z',
        status: 'PUBLISHED' as const,
      },
    ]),
  };
  const programs = {
    all: vi.fn(() => [
      {
        id: 'PROGRAM-SEARCH',
        ownerId: 'PARTNER-1',
        ownerName: 'Nhà hảo tâm',
        title: 'Hỗ trợ chi phí điều trị ung thư',
        supportType: 'FINANCIAL' as const,
        description: 'Đồng hành với bệnh nhân có hoàn cảnh khó khăn.',
        regionId: 'ha-noi',
        city: 'Hà Nội',
        address: 'Quận Hai Bà Trưng',
        schedule: 'Thứ hai',
        capacity: 20,
        contactName: 'Trạm K',
        phone: '0900000000',
        email: 'tramk@example.com',
        status: 'PUBLISHED' as const,
        reviewedAt: '2026-10-03T00:00:00.000Z',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-03T00:00:00.000Z',
      },
    ]),
  };
  const api = {
    search: vi.fn((_query: string): Observable<readonly SearchResultItem[] | null> => of(null)),
  };

  beforeEach(() => {
    content.list.mockClear();
    podcasts.items.mockClear();
    programs.all.mockClear();
    api.search.mockClear();
    api.search.mockReturnValue(of(null));
    TestBed.configureTestingModule({
      providers: [
        { provide: ContentService, useValue: content },
        { provide: PublishedPodcastService, useValue: podcasts },
        { provide: CharityProgramStorageService, useValue: programs },
        { provide: SiteSearchApiService, useValue: api },
      ],
    });
  });

  it('combines published content, podcasts and support programs with accent-insensitive search', async () => {
    const service = TestBed.inject(SiteSearchService);
    const results = await firstValueFrom(service.search('ung thu'));

    expect(results.map((item) => item.type)).toEqual(['SUPPORT_PROGRAM', 'PODCAST', 'GUIDE']);
    expect(results.find((item) => item.type === 'GUIDE')?.link).toBe(
      '/cam-nang/dinh-duong-ung-thu',
    );
    expect(results.find((item) => item.type === 'PODCAST')?.queryParams).toEqual({
      podcast: 'PODCAST-SEARCH',
    });
    expect(results.some((item) => item.id === 'PODCAST-DRAFT')).toBe(false);
    expect(content.list).toHaveBeenCalledTimes(3);
    expect(api.search).toHaveBeenCalledWith('ung thu');
  });

  it('prefers backend data for duplicate records and keeps local-only results', async () => {
    api.search.mockReturnValue(
      of([
        {
          id: 'GUIDE-SEARCH',
          type: 'GUIDE' as const,
          title: 'Tiêu đề từ backend',
          description: 'Dữ liệu đã đồng bộ.',
          eyebrow: 'Cẩm nang',
          metadata: 'Dinh dưỡng',
          link: '/cam-nang/dinh-duong-ung-thu',
          publishedAt: '2026-10-04T00:00:00.000Z',
          score: 90,
        },
        {
          id: 'STORY-REMOTE',
          type: 'STORY' as const,
          title: 'Câu chuyện từ backend',
          description: 'Nội dung chỉ có trên máy chủ.',
          eyebrow: 'Câu chuyện',
          metadata: 'Cộng đồng',
          link: '/cau-chuyen/bai-viet/cau-chuyen-moi',
          publishedAt: '2026-10-04T00:00:00.000Z',
          score: 70,
        },
      ]),
    );

    const results = await firstValueFrom(TestBed.inject(SiteSearchService).search('ung thu'));

    expect(results.filter((item) => item.id === 'GUIDE-SEARCH')).toHaveLength(1);
    expect(results.find((item) => item.id === 'GUIDE-SEARCH')?.title).toBe('Tiêu đề từ backend');
    expect(results.some((item) => item.id === 'STORY-REMOTE')).toBe(true);
    expect(results.some((item) => item.id === 'PODCAST-SEARCH')).toBe(true);
  });

  it('returns no results and does not query sources for a blank keyword', async () => {
    const service = TestBed.inject(SiteSearchService);

    await expect(firstValueFrom(service.search('   '))).resolves.toEqual([]);
    expect(content.list).not.toHaveBeenCalled();
    expect(api.search).not.toHaveBeenCalled();
  });
});
