import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { MOCK_CONTENT_ITEMS } from '../data/content.mock-data';
import { ContentMockApiService } from './content-mock-api.service';
import { ContentAdminStorageService } from './content-admin-storage.service';

describe('ContentAdminStorageService integration', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('hides and republishes content through the public content API', async () => {
    const admin = TestBed.inject(ContentAdminStorageService);
    const api = TestBed.inject(ContentMockApiService);
    const item = MOCK_CONTENT_ITEMS.find((candidate) => candidate.status === 'PUBLISHED')!;

    admin.update(item.id, {
      title: item.title,
      excerpt: item.excerpt,
      status: 'ARCHIVED',
    });
    await expect(firstValueFrom(api.getBySlug(item.kind, item.slug))).rejects.toBeTruthy();

    admin.update(item.id, {
      title: `${item.title} - đã cập nhật`,
      excerpt: item.excerpt,
      status: 'PUBLISHED',
    });
    const published = await firstValueFrom(api.getBySlug(item.kind, item.slug));
    expect(published.title).toContain('đã cập nhật');
  });

  it('keeps editorial fields when a later update only changes publication status', () => {
    const admin = TestBed.inject(ContentAdminStorageService);
    const item = MOCK_CONTENT_ITEMS[0];
    const coverImage = {
      url: 'data:image/webp;base64,editorial-cover',
      alt: 'Ảnh đại diện bài viết',
      caption: 'Ảnh do tác giả cung cấp',
      width: 1200,
      height: 675,
    };

    admin.update(item.id, {
      category: { id: 'CAT-TEST', name: 'Danh mục mới', slug: 'danh-muc-moi' },
      coverImage,
      sections: [{ paragraphs: ['Nội dung mới của bài viết.'] }],
      readingMinutes: 4,
    });
    admin.update(item.id, { status: 'ARCHIVED' });

    const updated = admin
      .resolve(MOCK_CONTENT_ITEMS)
      .find((candidate) => candidate.id === item.id)!;
    expect(updated.category.name).toBe('Danh mục mới');
    expect(updated.coverImage).toEqual(coverImage);
    expect(updated.sections[0].paragraphs).toEqual(['Nội dung mới của bài viết.']);
    expect(updated.readingMinutes).toBe(4);
    expect(updated.status).toBe('ARCHIVED');
    expect(localStorage.getItem('tram-k.content-admin-state')).toBeNull();
  });
});
