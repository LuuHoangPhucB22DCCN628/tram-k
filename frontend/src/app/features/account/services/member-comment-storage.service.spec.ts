import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { CommunityEngagementApiService } from './community-engagement-api.service';

import { MemberCommentStorageService } from './member-comment-storage.service';

describe('MemberCommentStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('keeps comments separated by account', () => {
    const service = TestBed.inject(MemberCommentStorageService);
    service.create('USER-A', {
      authorName: 'Người dùng A',
      content: 'Bình luận của A',
      sourceTitle: 'Câu chuyện A',
      sourcePath: '/cau-chuyen/a',
    });
    service.create('USER-B', {
      authorName: 'Người dùng B',
      content: 'Bình luận của B',
      sourceTitle: 'Câu chuyện B',
      sourcePath: '/cau-chuyen/b',
    });

    expect(service.commentsFor('USER-A').map((comment) => comment.content)).toEqual([
      'Bình luận của A',
    ]);
    expect(service.commentsFor('USER-B').map((comment) => comment.content)).toEqual([
      'Bình luận của B',
    ]);
  });

  it('prevents another account from updating or removing a comment', () => {
    const service = TestBed.inject(MemberCommentStorageService);
    const comment = service.create('OWNER', {
      authorName: 'Chủ bình luận',
      content: 'Nội dung ban đầu',
      sourceTitle: 'Câu chuyện',
      sourcePath: '/cau-chuyen',
    });

    expect(service.update('OTHER', comment.id, 'Nội dung đã sửa')).toBe(false);
    expect(service.remove('OTHER', comment.id)).toBe(false);
    expect(service.update('OWNER', comment.id, 'Nội dung đã sửa')).toBe(true);
    expect(service.remove('OWNER', comment.id)).toBe(true);
    expect(service.commentsForSource('/cau-chuyen')[0].deletedAt).toBeTruthy();
    expect(service.commentsForSource('/cau-chuyen')[0].content).toBe('');
  });

  it('keeps replies visible when the parent comment is soft deleted', () => {
    const service = TestBed.inject(MemberCommentStorageService);
    const parent = service.create('OWNER', {
      authorName: 'Chủ bình luận',
      content: 'Bình luận gốc',
      sourceTitle: 'Câu chuyện',
      sourcePath: '/cau-chuyen',
    });
    service.create('OTHER', {
      authorName: 'Người trả lời',
      content: 'Nội dung trả lời',
      sourceTitle: 'Câu chuyện',
      sourcePath: '/cau-chuyen',
      parentId: parent.id,
    });
    service.remove('OWNER', parent.id);
    const thread = service.commentsForSource('/cau-chuyen');
    expect(thread).toHaveLength(2);
    expect(thread.find((comment) => comment.parentId === parent.id)?.content).toBe(
      'Nội dung trả lời',
    );
  });

  it('allows moderation to remove an existing comment', () => {
    const service = TestBed.inject(MemberCommentStorageService);
    const comment = service.create('OWNER', {
      authorName: 'Chủ bình luận',
      content: 'Bình luận vi phạm',
      sourceTitle: 'Câu chuyện',
      sourcePath: '/cau-chuyen',
    });

    expect(service.moderateRemove(comment.id)).toBe(true);
    expect(service.moderateRemove(comment.id)).toBe(false);
    expect(service.commentsFor('OWNER')).toHaveLength(0);
  });

  it('keeps a legacy comment locally when the server cannot accept it', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: { currentUser: () => ({ id: 'USER-A' }), authMode: () => 'REMOTE' } },
      { provide: CommunityEngagementApiService, useValue: { available: true, createComment: () => of(null) } },
    ] });
    const service = TestBed.inject(MemberCommentStorageService);
    service.create('USER-A', {
      authorName: 'Người dùng A', content: 'Bình luận cũ', sourceTitle: 'Câu chuyện',
      sourcePath: '/goc-tam-ly?story=POST-1#cau-chuyen-POST-1',
    });
    await expect(service.migrateLegacyFor('USER-A')).resolves.toEqual({ migrated: 0, remaining: 1 });
    expect(service.legacyCountFor('USER-A')).toBe(1);
    expect(JSON.parse(localStorage.getItem('tram-k.member-comments') ?? '[]')).toHaveLength(1);
  });

  it('removes a legacy comment only after the server confirms it', async () => {
    TestBed.resetTestingModule();
    let idempotencyKey = '';
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: { currentUser: () => ({ id: 'USER-A' }), authMode: () => 'REMOTE' } },
      { provide: CommunityEngagementApiService, useValue: { available: true,
        createComment: (_source: string, input: { idempotencyKey: string }) => {
          idempotencyKey = input.idempotencyKey;
          return of({ id: 'REMOTE-1', userId: 'USER-A', authorName: 'Người dùng A',
            content: 'Bình luận cũ', sourceTitle: 'Câu chuyện',
            sourcePath: '/goc-tam-ly?story=POST-1#cau-chuyen-POST-1',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        },
      } },
    ] });
    const service = TestBed.inject(MemberCommentStorageService);
    const legacy = service.create('USER-A', {
      authorName: 'Người dùng A', content: 'Bình luận cũ', sourceTitle: 'Câu chuyện',
      sourcePath: '/goc-tam-ly?story=POST-1#cau-chuyen-POST-1',
    });
    await expect(service.migrateLegacyFor('USER-A')).resolves.toEqual({ migrated: 1, remaining: 0 });
    expect(idempotencyKey).toBe(`legacy:${legacy.id}`);
    expect(service.commentsFor('USER-A').map((comment) => comment.id)).toEqual(['REMOTE-1']);
    expect(JSON.parse(localStorage.getItem('tram-k.member-comments') ?? '[]')).toHaveLength(0);
  });
});
