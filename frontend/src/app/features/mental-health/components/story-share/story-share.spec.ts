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
    await TestBed.configureTestingModule({
      imports: [StoryShare],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: user } },
        { provide: MemberPostStorageService, useValue: { create, posts } },
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
  it('rejects whitespace-only text and requires consent for submission', () => {
    const { component } = setup();
    component.save('PENDING');
    expect(create).not.toHaveBeenCalled();
    component.form.patchValue({ title: '       ', consent: true });
    component.save('PENDING');
    expect(create).not.toHaveBeenCalled();
  });
  it('saves a trimmed draft without public consent and prevents duplicate submissions', () => {
    const { component } = setup();
    component.save('DRAFT');
    component.save('DRAFT');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      'member-1',
      expect.objectContaining({ title: 'Một ngày bình yên', status: 'DRAFT' }),
      'Mai',
    );
  });
  it('submits for review and links to the correct account area', () => {
    user.set({ id: 'partner-1', displayName: 'Lan', role: 'PARTNER' });
    const { fixture, component } = setup();
    component.form.patchValue({ consent: true });
    component.save('PENDING');
    fixture.detectChanges();
    expect(create).toHaveBeenCalledWith(
      'partner-1',
      expect.objectContaining({ status: 'PENDING' }),
      'Lan',
    );
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/doi-tac/bai-viet');
  });
  it('keeps the story if saving fails and permits retry', () => {
    const { component } = setup();
    create.mockImplementationOnce(() => {
      throw new Error('quota');
    });
    component.save('DRAFT');
    expect(component.form.controls.content.value).not.toBe('');
    expect(component.failed()).toBe(true);
    component.save('DRAFT');
    expect(component.saved()).toBe(true);
  });

  it('posts a comment and a reply under the selected story', () => {
    const { component } = setup();
    const story = component.sharedStories()[0];
    component.commentForm.setValue({ content: 'Cảm ơn bạn đã chia sẻ câu chuyện này.' });
    component.submitComment(story);
    const comments = TestBed.inject(MemberCommentStorageService);
    const parent = comments.commentsForSource(component.storyPath(story.id))[0];
    expect(parent.content).toContain('Cảm ơn');
    component.startReply(parent);
    component.commentForm.setValue({ content: 'Mình cũng muốn gửi một lời đồng hành.' });
    component.submitComment(story);
    expect(component.repliesFor(story, parent.id)).toHaveLength(1);
  });

  it('toggles or changes a single reaction for the current account', () => {
    const { component } = setup();
    const story = component.sharedStories()[0];
    component.toggleReaction(story, 'LIKE');
    component.toggleReaction(story, 'LOVE');
    const reactions = TestBed.inject(CommunityReactionStorageService);
    expect(reactions.reactions()).toHaveLength(1);
    expect(component.selectedReaction(story)).toBe('LOVE');
    component.toggleReaction(story, 'LOVE');
    expect(component.selectedReaction(story)).toBeNull();
  });
});
