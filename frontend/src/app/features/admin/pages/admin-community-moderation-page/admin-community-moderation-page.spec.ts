import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MemberCommentStorageService } from '@features/account/services/member-comment-storage.service';
import { MemberPostStorageService } from '@features/account/services/member-post-storage.service';

import { AdminCommunityModerationPage } from './admin-community-moderation-page';

describe('AdminCommunityModerationPage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('publishes a post and removes a comment from the shared stores', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCommunityModerationPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const posts = TestBed.inject(MemberPostStorageService);
    const comments = TestBed.inject(MemberCommentStorageService);
    const post = posts.create(
      'MEMBER-A',
      {
        title: 'Một câu chuyện mới',
        content: 'Nội dung bài viết đủ dài để gửi tới quản trị viên duyệt.',
        status: 'PENDING',
      },
      'Nguyễn An Nhiên',
    );
    comments.create('MEMBER-A', {
      authorName: 'Nguyễn An Nhiên',
      content: 'Bình luận cần gỡ',
      sourceTitle: 'Câu chuyện',
      sourcePath: '/cau-chuyen',
    });

    const fixture = TestBed.createComponent(AdminCommunityModerationPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.moderation-card__approve')?.click();
    fixture.detectChanges();
    expect(posts.postsFor('MEMBER-A').find((item) => item.id === post.id)?.status).toBe(
      'PUBLISHED',
    );

    element.querySelectorAll<HTMLButtonElement>('.moderation-tabs button')[1].click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.moderation-card__reject')?.click();
    fixture.detectChanges();
    expect(comments.commentsFor('MEMBER-A')).toHaveLength(0);
  });

  it('supports arrow-key navigation between the moderation tabs', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCommunityModerationPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminCommunityModerationPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const tablist = element.querySelector<HTMLElement>('.moderation-tabs')!;

    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    const tabs = element.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('tabindex')).toBe('0');
    expect(element.querySelector('[role="tabpanel"]')?.id).toBe('moderation-panel-comments');
  });
});
