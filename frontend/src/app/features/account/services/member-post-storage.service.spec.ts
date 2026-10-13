import { TestBed } from '@angular/core/testing';

import { MemberPostStorageService } from './member-post-storage.service';

describe('MemberPostStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('keeps posts separated by account', () => {
    const service = TestBed.inject(MemberPostStorageService);
    service.create('USER-A', {
      title: 'Bài viết của A',
      content: 'Nội dung đủ dài của A.',
      status: 'DRAFT',
    });
    service.create('USER-B', {
      title: 'Bài viết của B',
      content: 'Nội dung đủ dài của B.',
      status: 'DRAFT',
    });

    expect(service.postsFor('USER-A').map((post) => post.title)).toEqual(['Bài viết của A']);
    expect(service.postsFor('USER-B').map((post) => post.title)).toEqual(['Bài viết của B']);
  });

  it('only submits and removes posts owned by the current account', () => {
    const service = TestBed.inject(MemberPostStorageService);
    const post = service.create('OWNER', {
      title: 'Một bản nháp',
      content: 'Nội dung của bản nháp này.',
      status: 'DRAFT',
    });

    expect(service.submit('OTHER', post.id)).toBe(false);
    expect(service.submit('OWNER', post.id)).toBe(true);
    expect(service.remove('OTHER', post.id)).toBe(false);
    expect(service.remove('OWNER', post.id)).toBe(true);
  });

  it('publishes or rejects only pending posts and requires a rejection reason', () => {
    const service = TestBed.inject(MemberPostStorageService);
    const published = service.create('OWNER', {
      title: 'Bài sẽ xuất bản',
      content: 'Nội dung bài viết đủ dài để gửi duyệt.',
      status: 'PENDING',
    });
    const rejected = service.create('OWNER', {
      title: 'Bài cần chỉnh sửa',
      content: 'Nội dung bài viết cần được bổ sung thêm.',
      status: 'PENDING',
    });

    expect(service.review(published.id, 'PUBLISHED')?.status).toBe('PUBLISHED');
    expect(service.review(rejected.id, 'REJECTED', 'Ngắn')).toBeNull();
    expect(
      service.review(rejected.id, 'REJECTED', 'Cần bổ sung nguồn thông tin cho nội dung này.')
        ?.rejectionReason,
    ).toContain('Cần bổ sung');
    expect(service.submit('OWNER', rejected.id)).toBe(true);
    expect(service.postsFor('OWNER').find((post) => post.id === rejected.id)?.status).toBe(
      'PENDING',
    );
  });
});
