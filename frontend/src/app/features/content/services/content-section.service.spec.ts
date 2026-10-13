import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { MOCK_CONTENT_ITEMS } from '../data/content.mock-data';
import { ContentAdminStorageService } from './content-admin-storage.service';
import { DEFAULT_EDITOR_COVER_IMAGE } from './content-cover.utils';
import {
  CONTENT_SECTION_LIMIT,
  ContentSectionService,
  mergeContentSection,
} from './content-section.service';

describe('ContentSectionService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('filters by kind and category before applying the four-card limit', async () => {
    const admin = TestBed.inject(ContentAdminStorageService);
    const section = TestBed.inject(ContentSectionService);
    const guide = MOCK_CONTENT_ITEMS.find(
      (item) => item.kind === 'GUIDE' && item.category.slug === 'dau-hieu',
    )!;

    admin.create({
      ...guide,
      id: 'GUIDE-NEWEST',
      slug: 'dau-hieu-moi-nhat',
      title: 'Dấu hiệu mới nhất',
      featured: false,
      publishedAt: '2099-01-01T00:00:00.000Z',
    });

    const signs = await firstValueFrom(section.latest({ kind: 'GUIDE', categorySlug: 'dau-hieu' }));
    const nutrition = await firstValueFrom(
      section.latest({ kind: 'GUIDE', categorySlug: 'dinh-duong' }),
    );

    expect(signs).toHaveLength(CONTENT_SECTION_LIMIT);
    expect(signs[0].id).toBe('GUIDE-NEWEST');
    expect(signs.some((item) => item.id === 'GUIDE-NEWEST')).toBe(true);
    expect(signs.every((item) => item.kind === 'GUIDE' && item.category.slug === 'dau-hieu')).toBe(
      true,
    );
    expect(nutrition).toHaveLength(CONTENT_SECTION_LIMIT);
    expect(nutrition[0].featured).toBe(true);
    expect(nutrition.every((item) => item.category.slug === 'dinh-duong')).toBe(true);
  });

  it('keeps story and cancer content in their selected public sections', async () => {
    const section = TestBed.inject(ContentSectionService);
    const stories = await firstValueFrom(section.latest({ kind: 'STORY' }));
    const cancers = await firstValueFrom(section.latest({ kind: 'CANCER_TYPE' }));

    expect(stories.length).toBeLessThanOrEqual(CONTENT_SECTION_LIMIT);
    expect(stories.every((item) => item.kind === 'STORY')).toBe(true);
    expect(cancers.length).toBeLessThanOrEqual(CONTENT_SECTION_LIMIT);
    expect(cancers.every((item) => item.kind === 'CANCER_TYPE')).toBe(true);
  });

  it('fills a section without duplicating primary items or exceeding the shared limit', () => {
    const merged = mergeContentSection(
      [{ id: 'new' }, { id: 'shared' }],
      [{ id: 'shared' }, { id: 'old-1' }, { id: 'old-2' }, { id: 'old-3' }],
      (item) => item.id,
    );

    expect(merged.map((item) => item.id)).toEqual(['new', 'shared', 'old-1', 'old-2']);
  });

  it('keeps a section-specific Figma slot count', () => {
    const merged = mergeContentSection(
      [{ id: 'new' }],
      Array.from({ length: 7 }, (_, index) => ({ id: `figma-${index + 1}` })),
      (item) => item.id,
      7,
    );

    expect(merged.map((item) => item.id)).toEqual([
      'new',
      'figma-1',
      'figma-2',
      'figma-3',
      'figma-4',
      'figma-5',
      'figma-6',
    ]);
  });

  it('returns only published admin-created cards with a real cover image', async () => {
    const admin = TestBed.inject(ContentAdminStorageService);
    const section = TestBed.inject(ContentSectionService);
    const story = MOCK_CONTENT_ITEMS.find((item) => item.kind === 'STORY')!;
    admin.create({
      ...story,
      id: 'ADMIN-WITH-COVER',
      title: 'Bài có ảnh',
      coverImage: {
        ...story.coverImage,
        url: '/assets/images/stories/card-2.png',
      },
    });
    admin.create({
      ...story,
      id: 'ADMIN-WITHOUT-COVER',
      title: 'Bài thiếu ảnh',
      coverImage: DEFAULT_EDITOR_COVER_IMAGE,
    });

    const items = await firstValueFrom(section.latestCreated({ kind: 'STORY' }));

    expect(items.map((item) => item.id)).toEqual(['ADMIN-WITH-COVER']);
  });

  it('orders admin-created cards by publication date before applying the shared limit', async () => {
    const admin = TestBed.inject(ContentAdminStorageService);
    const section = TestBed.inject(ContentSectionService);
    const story = MOCK_CONTENT_ITEMS.find((item) => item.kind === 'STORY')!;
    const publishedItems = [
      ['ADMIN-OLDEST', '2099-01-01T00:00:00.000Z'],
      ['ADMIN-NEWEST', '2099-01-05T00:00:00.000Z'],
      ['ADMIN-THIRD', '2099-01-03T00:00:00.000Z'],
      ['ADMIN-SECOND', '2099-01-04T00:00:00.000Z'],
      ['ADMIN-FOURTH', '2099-01-02T00:00:00.000Z'],
    ] as const;

    for (const [id, publishedAt] of publishedItems) {
      admin.create({
        ...story,
        id,
        slug: id.toLowerCase(),
        title: id,
        featured: false,
        status: 'PUBLISHED',
        publishedAt,
        coverImage: {
          ...story.coverImage,
          url: '/assets/images/stories/card-2.png',
        },
      });
    }

    const items = await firstValueFrom(section.latestCreated({ kind: 'STORY' }));

    expect(items.map((item) => item.id)).toEqual([
      'ADMIN-NEWEST',
      'ADMIN-SECOND',
      'ADMIN-THIRD',
      'ADMIN-FOURTH',
    ]);
    expect(items).toHaveLength(CONTENT_SECTION_LIMIT);
  });
});
