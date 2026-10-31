import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { MemberPostStorageService } from '../../../account/services/member-post-storage.service';
import { MemberCommentStorageService } from '../../../account/services/member-comment-storage.service';
import { CommunityReactionStorageService } from '../../../account/services/community-reaction-storage.service';
import { StoryShare } from './story-share';

describe('StoryShare', () => {
  const user = signal<any>(null);
  const posts = signal<any[]>([]);
  const create = vi.fn();
  beforeEach(async () => {
    localStorage.clear();
    user.set({ id: 'member-1', displayName: 'Mai', role: 'PATIENT' });
    posts.set([]);
    create.mockReset();
    create.mockResolvedValue({ id: 'saved-story' });
    await TestBed.configureTestingModule({
      imports: [StoryShare],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: user } },
        {
          provide: MemberPostStorageService,
          useValue: { createConfirmed: create, publishedPosts: posts, initializePublic: vi.fn() },
        },
      ],
    }).compileComponents();
  });
  afterEach(() => localStorage.clear());
  function setup() {
    const fixture = TestBed.createComponent(StoryShare);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    component.form.setValue({
      title: '  Một ngày bình yên  ',
      content: 'Một câu chuyện giúp tôi cảm thấy được đồng hành.',
      consent: false,
    });
    return { fixture, component };
  }
  it('asks guests to sign in with a return URL and hides the composer', () => {
    user.set(null);
    const { fixture } = setup();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toContain('returnUrl=');
    expect(fixture.nativeElement.querySelectorAll('.shared-story')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('.story-share__intro').classList).toContain(
      'ui-reveal--left',
    );
    expect(fixture.nativeElement.querySelector('.story-share__card').classList).toContain(
      'ui-reveal--right',
    );
    expect(
      [...fixture.nativeElement.querySelectorAll('.shared-story')].every((story: Element) =>
        story.classList.contains('ui-reveal'),
      ),
    ).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.shared-story[data-ui-card]')).toHaveLength(3);
  });
  it('expands and collapses a sample community story without repeated markup', () => {
    const { fixture } = setup();
    const cards = fixture.nativeElement.querySelectorAll('.shared-story');
    expect(cards).toHaveLength(3);
    expect(
      new Set([...cards].map((card: Element) => card.querySelector('h3')?.textContent)).size,
    ).toBe(3);
    const button = cards[0].querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(cards[0].querySelector('.shared-story__content--expanded')).not.toBeNull();
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
  it('shows additional community stories from the bottom-right section control', () => {
    posts.set(
      Array.from({ length: 3 }, (_, index) => ({
        id: `published-story-${index}`,
        userId: `member-${index + 2}`,
        authorName: `Thành viên ${index + 1}`,
        title: `Câu chuyện mới từ cộng đồng ${index + 1}`,
        content: 'Nội dung câu chuyện đã được duyệt và chia sẻ cùng cộng đồng Trạm K.',
        status: 'PUBLISHED',
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-02T08:00:00.000Z',
        reviewedAt: `2026-10-0${index + 3}T08:00:00.000Z`,
      })),
    );
    const { fixture } = setup();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.shared-story')).toHaveLength(3);
    const sectionMore = element.querySelector<HTMLButtonElement>('app-ui-section-more button')!;
    expect(sectionMore.getAttribute('aria-label')).toBe('Xem thêm 5 nội dung');

    sectionMore.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('.shared-story')).toHaveLength(6);
    expect(sectionMore.getAttribute('aria-expanded')).toBe('true');
    expect(sectionMore.textContent).toContain('Thu gọn');

    const pageTwo = element.querySelector<HTMLButtonElement>('button[aria-label="Trang 2"]')!;
    pageTwo.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('.shared-story')).toHaveLength(2);
    expect(pageTwo.getAttribute('aria-current')).toBe('page');
  });
  it('links a published author profile and shows the saved avatar', () => {
    user.set({
      id: 'member-1',
      displayName: 'Mai',
      role: 'PATIENT',
      avatarUrl: 'data:image/png;base64,YWJj',
    });
    posts.set([
      {
        id: 'published-story-1',
        userId: 'member-1',
        authorName: 'Mai',
        title: 'Câu chuyện của Mai',
        content: 'Nội dung câu chuyện đã được duyệt và chia sẻ.',
        status: 'PUBLISHED',
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-02T08:00:00.000Z',
        reviewedAt: '2026-10-03T08:00:00.000Z',
      },
    ]);
    const { fixture } = setup();
    const card = (fixture.nativeElement as HTMLElement).querySelector('.shared-story')!;
    expect(card.querySelector('a[aria-label="Xem hồ sơ Mai"]')?.getAttribute('href')).toBe(
      '/ho-so/member-1',
    );
    expect(card.querySelector('app-member-avatar img')?.getAttribute('src')).toBe(
      'data:image/png;base64,YWJj',
    );
  });
  it('does not offer another member’s private profile or avatar to visitors', () => {
    user.set(null);
    posts.set([
      {
        id: 'private-author-story',
        userId: 'member-private',
        authorName: 'Tác giả',
        profileVisibility: 'PRIVATE',
        title: 'Câu chuyện riêng',
        content: 'Nội dung câu chuyện đã được duyệt và chia sẻ.',
        status: 'PUBLISHED',
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-02T08:00:00.000Z',
      },
    ]);
    const { fixture } = setup();
    const card = (fixture.nativeElement as HTMLElement).querySelector('.shared-story')!;
    expect(card.querySelector('a[aria-label^="Xem hồ sơ"]')).toBeNull();
    expect(card.querySelector('app-member-avatar img')).toBeNull();
  });
  it('rejects whitespace-only text and requires consent for submission', () => {
    const { component } = setup();
    component.save('PENDING');
    expect(create).not.toHaveBeenCalled();
    component.form.patchValue({ title: '       ', consent: true });
    component.save('PENDING');
    expect(create).not.toHaveBeenCalled();
  });
  it('saves a trimmed draft without public consent and prevents duplicate submissions', async () => {
    const { component } = setup();
    await component.save('DRAFT');
    await component.save('DRAFT');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      'member-1',
      expect.objectContaining({ title: 'Một ngày bình yên', status: 'DRAFT' }),
      'Mai',
    );
  });
  it('submits for review and links to the correct account area', async () => {
    user.set({ id: 'partner-1', displayName: 'Lan', role: 'PARTNER' });
    const { fixture, component } = setup();
    component.form.patchValue({ consent: true });
    await component.save('PENDING');
    fixture.detectChanges();
    expect(create).toHaveBeenCalledWith(
      'partner-1',
      expect.objectContaining({ status: 'PENDING' }),
      'Lan',
    );
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/doi-tac/bai-viet');
  });
  it('keeps the story if saving fails and permits retry', async () => {
    const { component } = setup();
    create.mockImplementationOnce(() => {
      throw new Error('quota');
    });
    await component.save('DRAFT');
    expect(component.form.controls.content.value).not.toBe('');
    expect(component.failed()).toBe(true);
    await component.save('DRAFT');
    expect(component.saved()).toBe(true);
  });

  it('posts a comment and a reply under the selected story', async () => {
    const { component } = setup();
    const story = component.sharedStories()[0];
    component.commentForm.setValue({ content: 'Cảm ơn bạn đã chia sẻ câu chuyện này.' });
    await component.submitComment(story);
    const comments = TestBed.inject(MemberCommentStorageService);
    const parent = comments.commentsForSource(component.storyPath(story.id))[0];
    expect(parent.content).toContain('Cảm ơn');
    component.startReply(parent);
    component.commentForm.setValue({ content: 'Mình cũng muốn gửi một lời đồng hành.' });
    await component.submitComment(story);
    expect(component.repliesFor(story, parent.id)).toHaveLength(1);
  });

  it('reports a failed new comment as a comment failure, not a reply failure', async () => {
    const { component } = setup();
    const comments = TestBed.inject(MemberCommentStorageService);
    vi.spyOn(comments, 'createConfirmed').mockResolvedValueOnce(false);
    component.commentForm.setValue({ content: 'alo' });

    await component.submitComment(component.sharedStories()[0]);

    expect(component.discussionNotice()).toContain('Không thể đăng bình luận');
    expect(component.discussionNotice()).not.toContain('trả lời');
    expect(component.commentForm.controls.content.value).toBe('alo');
  });

  it('toggles or changes a single reaction for the current account', async () => {
    const { component } = setup();
    const story = component.sharedStories()[0];
    await component.toggleReaction(story, 'LIKE');
    await component.toggleReaction(story, 'LOVE');
    const reactions = TestBed.inject(CommunityReactionStorageService);
    expect(reactions.reactions()).toHaveLength(1);
    expect(component.selectedReaction(story)).toBe('LOVE');
    await component.toggleReaction(story, 'LOVE');
    expect(component.selectedReaction(story)).toBeNull();
  });
});
