import { TestBed } from '@angular/core/testing';

import { DEFAULT_PODCASTS } from '../data/podcast.data';
import { PodcastAdminStorageService } from './podcast-admin-storage.service';

describe('PodcastAdminStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('creates and updates podcast items without duplicating the original cards', () => {
    const storage = TestBed.inject(PodcastAdminStorageService);
    storage.create({
      id: 'PODCAST-NEW',
      title: 'Một tập podcast mới',
      description: 'Nội dung đủ dài cho một tập podcast được tạo từ trang quản trị.',
      source: 'Trạm K',
      image: '/assets/images/mental-health/podcast-yoga.png',
      imageAlt: 'Ảnh minh họa tập podcast mới',
      audioUrl: '/assets/audio/podcast-moi.mp3',
      publishedAt: '2099-01-01T00:00:00.000Z',
      status: 'DRAFT',
    });
    storage.update('PODCAST-NEW', { status: 'PUBLISHED' });

    const items = storage.resolve(DEFAULT_PODCASTS);

    expect(items.filter((item) => item.id === 'PODCAST-NEW')).toHaveLength(1);
    expect(items.find((item) => item.id === 'PODCAST-NEW')?.status).toBe('PUBLISHED');
    expect(localStorage.getItem('tram-k.podcast-admin-state')).toBeNull();
  });
});
