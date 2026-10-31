import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { MemberAvatar } from '../../../profile/components/member-avatar/member-avatar';
import { RevealDirective } from '@shared/directives/reveal.directive';
import { UiSectionMore } from '@shared/ui';
import {
  EXPANDED_SECTION_PAGE_SIZE,
  paginateItems,
  parsePaginationPage,
  updatePaginationUrl,
} from '@shared/utils/pagination';
import { MemberPostStorageService } from '../../../account/services/member-post-storage.service';
import type { MemberComment } from '../../../account/models/member-comment.models';
import type { CommunityReactionType } from '../../../account/models/community-reaction.models';
import { MemberCommentStorageService } from '../../../account/services/member-comment-storage.service';
import { CommunityReactionStorageService } from '../../../account/services/community-reaction-storage.service';

interface SharedStory {
  readonly id: string;
  readonly userId?: string;
  readonly profileVisibility?: 'PUBLIC' | 'MEMBERS' | 'PRIVATE';
  readonly authorName: string;
  readonly authorRole: string;
  readonly title: string;
  readonly content: string;
  readonly publishedAt: string;
}

const COMMUNITY_STORY_PREVIEW_LIMIT = 3;

@Component({
  selector: 'app-story-share',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    RevealDirective,
    UiSectionMore,
    RouterLink,
    MemberAvatar,
  ],
  templateUrl: './story-share.html',
  styleUrl: './story-share.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoryShare {
  private readonly auth = inject(AuthService);
  private readonly storage = inject(MemberPostStorageService);
  private readonly commentsStorage = inject(MemberCommentStorageService);
  private readonly reactionsStorage = inject(CommunityReactionStorageService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly user = this.auth.currentUser;
  protected readonly canWrite = computed(() => {
    const role = this.user()?.role;
    return role === 'PATIENT' || role === 'CARER' || role === 'PARTNER';
  });
  protected readonly postsUrl = computed(() =>
    this.user()?.role === 'PARTNER' ? '/doi-tac/bai-viet' : '/thanh-vien/bai-viet',
  );
  protected readonly notice = signal('');
  protected readonly failed = signal(false);
  protected readonly saved = signal(false);
  protected readonly saving = signal(false);
  protected readonly expandedStoryId = signal<string | null>(null);
  protected readonly activeDiscussionId = signal<string | null>(null);
  protected readonly replyingToId = signal<string | null>(null);
  protected readonly editingCommentId = signal<string | null>(null);
  protected readonly discussionNotice = signal('');
  protected readonly discussionBusy = signal(false);
  protected readonly reactionBusy = signal<string | null>(null);
  protected readonly targetStoryId = signal<string | null>(null);
  protected readonly targetCommentId = signal<string | null>(null);
  protected readonly showAllStories = signal(false);
  protected readonly storyPage = signal(1);
  protected readonly reactionOptions: readonly {
    type: CommunityReactionType;
    icon: string;
    label: string;
  }[] = [
    { type: 'LIKE', icon: '👍', label: 'Đồng cảm' },
    { type: 'LOVE', icon: '💜', label: 'Yêu thương' },
    { type: 'SUPPORT', icon: '🤝', label: 'Đồng hành' },
  ];
  private readonly sampleStories: readonly SharedStory[] = [
    {
      id: 'sample-1',
      authorName: 'Ngọc An',
      authorRole: 'Bệnh nhân',
      title: 'Tôi học cách vui với từng ngày bình thường',
      content:
        'Những ngày đầu điều trị, tôi luôn chờ một tin thật lớn để thấy mình có hy vọng. Rồi một sáng, tôi nhận ra niềm vui có thể chỉ là ăn ngon một bữa, ngủ được một giấc trọn vẹn và nghe mẹ kể chuyện ngoài ban công. Tôi bắt đầu ghi lại ba điều nhỏ khiến mình mỉm cười mỗi ngày. Cuốn sổ ấy không làm hành trình ngắn hơn, nhưng giúp tôi nhìn thấy mình vẫn đang sống thật đầy.',
      publishedAt: '2026-09-18T08:30:00.000Z',
    },
    {
      id: 'sample-2',
      authorName: 'Minh Anh',
      authorRole: 'Người nhà bệnh nhân',
      title: 'Ở bên nhau không nhất thiết phải nói thật nhiều',
      content:
        'Có những hôm bố tôi không muốn trò chuyện. Tôi từng rất lo và liên tục hỏi bố có đau không, có cần gì không. Sau đó tôi học cách chỉ ngồi cạnh, cùng nghe một bản nhạc cũ hoặc gọt cho bố một quả táo. Sự im lặng không còn đáng sợ nữa. Đôi khi, điều người thân cần nhất là biết rằng họ không phải đi qua ngày hôm ấy một mình.',
      publishedAt: '2026-09-12T14:15:00.000Z',
    },
    {
      id: 'sample-3',
      authorName: 'Thành viên Trạm K',
      authorRole: 'Người đồng hành',
      title: 'Một lời hỏi thăm đúng lúc đã giữ tôi lại',
      content:
        'Trong tuần mệt mỏi nhất, một người bạn nhắn rằng tôi không cần trả lời ngay, bạn chỉ muốn tôi biết vẫn có người đang nghĩ đến mình. Tin nhắn rất ngắn nhưng khiến tôi thấy được nâng đỡ. Từ đó, tôi cũng tập gửi những lời hỏi thăm không tạo áp lực cho người khác. Sự tử tế đôi khi bắt đầu bằng một câu đơn giản: Hôm nay bạn có muốn mình ngồi cạnh không?',
      publishedAt: '2026-09-05T10:00:00.000Z',
    },
    {
      id: 'sample-4',
      authorName: 'Hoàng Nam',
      authorRole: 'Bệnh nhân',
      title: 'Tôi thôi đếm những ngày khó khăn',
      content:
        'Có một thời gian tôi chỉ nhìn lịch bằng những lần điều trị và những ngày mệt. Sau đó, tôi thử đánh dấu thêm cả ngày mình đi bộ được một vòng sân, ngày ăn ngon hơn và ngày cười cùng con. Những dấu nhỏ ấy giúp tôi hiểu rằng cuộc sống vẫn đang diễn ra bên cạnh bệnh tật. Tôi không còn buộc mình phải luôn mạnh mẽ, chỉ cố gắng thành thật với cảm xúc và bước tiếp theo nhịp của riêng mình.',
      publishedAt: '2026-08-29T09:20:00.000Z',
    },
    {
      id: 'sample-5',
      authorName: 'Thu Hà',
      authorRole: 'Người nhà bệnh nhân',
      title: 'Bữa cơm nhỏ sau một ngày dài',
      content:
        'Mẹ tôi thường không ăn được nhiều sau mỗi đợt điều trị. Cả nhà thôi cố làm những món thật cầu kỳ, thay vào đó hỏi mẹ hôm nay muốn ăn gì và cùng ngồi bên bàn dù bữa cơm rất ngắn. Có hôm chỉ là vài thìa cháo, nhưng cảm giác được lựa chọn khiến mẹ vui hơn. Tôi nhận ra chăm sóc không phải lúc nào cũng là làm thật nhiều, mà là lắng nghe điều người thân thật sự cần.',
      publishedAt: '2026-08-22T16:40:00.000Z',
    },
  ];
  protected readonly sharedStories = computed<readonly SharedStory[]>(() => {
    const publishedStories = this.storage.publishedPosts().map((post) => ({
      id: post.id,
      userId: post.userId,
      profileVisibility: post.profileVisibility,
      authorName: post.authorName,
      authorRole: 'Thành viên Trạm K',
      title: post.title,
      content: post.content,
      publishedAt: post.reviewedAt ?? post.updatedAt,
    }));
    return [...publishedStories, ...this.sampleStories];
  });
  protected readonly storyPagination = computed(() =>
    paginateItems(this.sharedStories(), this.storyPage(), EXPANDED_SECTION_PAGE_SIZE),
  );
  protected readonly displayedStories = computed(() =>
    this.showAllStories()
      ? this.storyPagination().items
      : this.sharedStories().slice(0, COMMUNITY_STORY_PREVIEW_LIMIT),
  );
  protected readonly remainingStoryCount = computed(() =>
    Math.max(this.sharedStories().length - COMMUNITY_STORY_PREVIEW_LIMIT, 0),
  );
  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
    content: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(5000)]],
    consent: [false, Validators.requiredTrue],
  });
  protected readonly commentForm = this.formBuilder.nonNullable.group({
    content: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(1000)]],
  });
  protected readonly editCommentForm = this.formBuilder.nonNullable.group({
    content: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(1000)]],
  });

  constructor() {
    this.storage.initializePublic();
    effect(() => {
      const stories = this.sharedStories();
      for (const story of stories) {
        const path = this.storyPath(story.id);
        this.commentsStorage.initializeForSource(story.id, path);
        this.reactionsStorage.initializeForSource(story.id, path);
      }
      const target = this.targetStoryId();
      if (target) {
        const index = stories.findIndex((story) => story.id === target);
        if (index >= 0) this.storyPage.set(Math.floor(index / EXPANDED_SECTION_PAGE_SIZE) + 1);
      }
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const targetStoryId = params.get('story');
      this.targetStoryId.set(targetStoryId);
      this.targetCommentId.set(params.get('comment'));
      if (targetStoryId) {
        this.storage.initializePublic();
        const path = this.storyPath(targetStoryId);
        this.commentsStorage.initializeForSource(targetStoryId, path, true);
        this.reactionsStorage.initializeForSource(targetStoryId, path, true);
        this.expandedStoryId.set(targetStoryId);
        this.activeDiscussionId.set(targetStoryId);
        this.showAllStories.set(true);
      }
    });
    const initialPage = parsePaginationPage(this.route.snapshot.queryParamMap.get('storyPage'));
    if (initialPage) {
      this.storyPage.set(initialPage);
      this.showAllStories.set(true);
    }
  }

  protected invalid(field: 'title' | 'content' | 'consent'): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  protected async save(status: 'DRAFT' | 'PENDING'): Promise<void> {
    if (!this.canWrite() || this.saved() || this.saving()) return;
    this.notice.set('');
    this.failed.set(false);
    const { title, content } = this.form.getRawValue();
    this.form.patchValue({ title: title.trim(), content: content.trim() });
    this.form.markAllAsTouched();
    if (
      this.form.controls.title.invalid ||
      this.form.controls.content.invalid ||
      (status === 'PENDING' && this.form.controls.consent.invalid)
    )
      return;
    this.saving.set(true);
    try {
      const user = this.user()!;
      const post = await this.storage.createConfirmed(
        user.id,
        { ...this.form.getRawValue(), status },
        user.displayName,
      );
      if (!post) throw new Error('save');
      this.saved.set(true);
      this.form.reset();
      this.notice.set(
        status === 'DRAFT'
          ? 'Đã lưu bản nháp. Bạn có thể tìm lại trong Bài viết của tôi.'
          : 'Cảm ơn bạn đã chia sẻ. Câu chuyện đã được gửi duyệt và chưa hiển thị công khai.',
      );
    } catch {
      this.failed.set(true);
      this.notice.set(
        'Chưa thể lưu bài viết. Nội dung vẫn được giữ trong khung soạn thảo, bạn hãy thử lại.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected writeAgain(): void {
    this.saved.set(false);
    this.notice.set('');
  }

  protected toggleStoryList(): void {
    const expanded = !this.showAllStories();
    this.storyPage.set(1);
    this.showAllStories.set(expanded);
    void updatePaginationUrl(this.router, this.route, 'storyPage', expanded ? 1 : null);
  }

  protected selectStoryPage(page: number): void {
    this.storyPage.set(page);
    void updatePaginationUrl(this.router, this.route, 'storyPage', page);
  }

  protected toggleStory(storyId: string): void {
    this.expandedStoryId.update((currentId) => (currentId === storyId ? null : storyId));
  }

  protected canViewProfile(
    userId: string | undefined,
    visibility: 'PUBLIC' | 'MEMBERS' | 'PRIVATE' | undefined,
  ): boolean {
    if (!userId) return false;
    if (this.user()?.id === userId) return true;
    return visibility === 'PUBLIC' || (visibility === 'MEMBERS' && Boolean(this.user()));
  }

  protected storyPath(storyId: string): string {
    return `/goc-tam-ly?story=${encodeURIComponent(storyId)}#cau-chuyen-${encodeURIComponent(storyId)}`;
  }

  protected commentsForStory(story: SharedStory): readonly MemberComment[] {
    return this.commentsStorage.commentsForSource(this.storyPath(story.id));
  }

  protected rootComments(story: SharedStory): readonly MemberComment[] {
    return this.commentsForStory(story).filter((comment) => !comment.parentId);
  }

  protected repliesFor(story: SharedStory, parentId: string): readonly MemberComment[] {
    return this.commentsForStory(story).filter((comment) => comment.parentId === parentId);
  }

  protected commentCount(story: SharedStory): number {
    return this.commentsForStory(story).filter((comment) => !comment.deletedAt).length;
  }

  protected toggleDiscussion(storyId: string): void {
    this.activeDiscussionId.update((current) => (current === storyId ? null : storyId));
    this.cancelCommentAction();
  }

  protected async submitComment(story: SharedStory): Promise<void> {
    if (this.discussionBusy()) return;
    const user = this.user();
    if (!user || !this.canWrite()) {
      this.discussionNotice.set('Vui lòng đăng nhập bằng tài khoản thành viên để bình luận.');
      return;
    }
    const content = this.commentForm.controls.content.value.trim();
    this.commentForm.setValue({ content });
    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }
    this.discussionBusy.set(true);
    const replying = !!this.replyingToId();
    try {
      const created = await this.commentsStorage.createConfirmed(user.id, story.id, {
        authorName: user.displayName,
        content,
        sourceTitle: story.title,
        sourcePath: this.storyPath(story.id),
        parentId: this.replyingToId() ?? undefined,
      });
      if (!created) throw new Error('comment');
      this.commentForm.reset();
      this.replyingToId.set(null);
      this.discussionNotice.set('Bình luận đã được đăng.');
    } catch {
      this.discussionNotice.set(
        this.commentsStorage.lastCreateError() ||
          (replying
            ? 'Không thể đăng trả lời. Vui lòng thử lại.'
            : 'Không thể đăng bình luận. Vui lòng thử lại.'),
      );
    } finally {
      this.discussionBusy.set(false);
    }
  }

  protected startReply(comment: MemberComment): void {
    if (comment.deletedAt) return;
    this.replyingToId.set(comment.id);
    this.editingCommentId.set(null);
    this.commentForm.reset();
    this.discussionNotice.set(`Đang trả lời ${comment.authorName}.`);
  }

  protected startEditing(comment: MemberComment): void {
    if (comment.userId !== this.user()?.id || comment.deletedAt) return;
    this.editingCommentId.set(comment.id);
    this.replyingToId.set(null);
    this.editCommentForm.setValue({ content: comment.content });
  }

  protected async saveComment(comment: MemberComment): Promise<void> {
    if (this.discussionBusy()) return;
    const user = this.user();
    const content = this.editCommentForm.controls.content.value.trim();
    this.editCommentForm.setValue({ content });
    if (!user || this.editCommentForm.invalid) {
      this.editCommentForm.markAllAsTouched();
      return;
    }
    this.discussionBusy.set(true);
    const updated = await this.commentsStorage.updateConfirmed(user.id, comment.id, content);
    this.discussionBusy.set(false);
    if (!updated) {
      this.discussionNotice.set('Bạn không có quyền sửa bình luận này.');
      return;
    }
    this.editingCommentId.set(null);
    this.editCommentForm.reset();
    this.discussionNotice.set('Đã cập nhật bình luận.');
  }

  protected async removeComment(comment: MemberComment): Promise<void> {
    if (this.discussionBusy()) return;
    const user = this.user();
    if (!user) return;
    this.discussionBusy.set(true);
    const removed = await this.commentsStorage.removeConfirmed(user.id, comment.id);
    this.discussionBusy.set(false);
    if (!removed) {
      this.discussionNotice.set('Bạn không có quyền xóa bình luận này.');
      return;
    }
    this.cancelCommentAction();
    this.discussionNotice.set('Đã xóa bình luận. Các câu trả lời vẫn được giữ lại.');
  }

  protected cancelCommentAction(): void {
    this.replyingToId.set(null);
    this.editingCommentId.set(null);
    this.commentForm.reset();
    this.editCommentForm.reset();
    this.discussionNotice.set('');
  }

  protected async toggleReaction(story: SharedStory, type: CommunityReactionType): Promise<void> {
    if (this.reactionBusy()) return;
    const user = this.user();
    if (!user || !this.canWrite()) {
      this.activeDiscussionId.set(story.id);
      this.discussionNotice.set('Vui lòng đăng nhập bằng tài khoản thành viên để thả cảm xúc.');
      return;
    }
    this.reactionBusy.set(story.id);
    try {
      const updated = await this.reactionsStorage.toggleConfirmed(
        user.id,
        story.id,
        this.storyPath(story.id),
        type,
      );
      if (!updated) this.discussionNotice.set('Chưa lưu được cảm xúc. Vui lòng thử lại.');
    } finally {
      this.reactionBusy.set(null);
    }
  }

  protected selectedReaction(story: SharedStory): CommunityReactionType | null {
    const user = this.user();
    return user ? this.reactionsStorage.reactionFor(user.id, this.storyPath(story.id)) : null;
  }

  protected reactionCount(story: SharedStory, type: CommunityReactionType): number {
    return this.reactionsStorage.countsFor(this.storyPath(story.id))[type];
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }
}
