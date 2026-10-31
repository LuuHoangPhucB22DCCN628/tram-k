import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { MemberComment } from '@features/account/models/member-comment.models';
import type { MemberPost } from '@features/account/models/member-post.models';
import { MemberCommentStorageService } from '@features/account/services/member-comment-storage.service';
import { MemberPostStorageService } from '@features/account/services/member-post-storage.service';
import { EscapeCloseDirective } from '@shared/directives/escape-close.directive';

type ModerationTab = 'POSTS' | 'COMMENTS';

@Component({
  selector: 'app-admin-community-moderation-page',
  standalone: true,
  imports: [DatePipe, RouterLink, EscapeCloseDirective],
  templateUrl: './admin-community-moderation-page.html',
  styleUrl: './admin-community-moderation-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCommunityModerationPage {
  private readonly postStorage = inject(MemberPostStorageService);
  private readonly commentStorage = inject(MemberCommentStorageService);

  protected readonly activeTab = signal<ModerationTab>('POSTS');
  protected readonly selectedPost = signal<MemberPost | null>(null);
  protected readonly rejectingPost = signal<MemberPost | null>(null);
  protected readonly rejectionReason = signal('');
  protected readonly feedback = signal('');
  protected readonly reviewBusy = signal(false);
  protected readonly posts = computed(() => this.postStorage.all());
  protected readonly comments = computed(() => this.commentStorage.all());

  constructor() {
    this.postStorage.initializeAdmin();
    this.commentStorage.initializeAdmin();
  }

  protected selectTab(tab: ModerationTab): void {
    this.activeTab.set(tab);
    this.feedback.set('');
  }

  protected handleTabKeydown(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const currentIndex = buttons.findIndex(
      (button) => button.getAttribute('aria-selected') === 'true',
    );
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) %
            buttons.length;
    const nextButton = buttons[nextIndex];
    this.selectTab(nextButton.dataset['tab'] as ModerationTab);
    nextButton.focus();
  }

  protected openPost(post: MemberPost): void {
    this.selectedPost.set(post);
  }

  protected closePost(): void {
    this.selectedPost.set(null);
  }

  protected async publish(post: MemberPost): Promise<void> {
    if (this.reviewBusy()) return;
    this.reviewBusy.set(true);
    try {
      const reviewed = await this.postStorage.reviewConfirmed(post.id, 'PUBLISHED');
      this.feedback.set(reviewed ? 'Đã xuất bản bài viết.' : 'Chưa duyệt được trên máy chủ. Vui lòng thử lại.');
      if (reviewed && this.selectedPost()?.id === post.id) this.closePost();
    } finally {
      this.reviewBusy.set(false);
    }
  }

  protected openReject(post: MemberPost): void {
    this.rejectingPost.set(post);
    this.rejectionReason.set('');
  }

  protected closeReject(): void {
    this.rejectingPost.set(null);
    this.rejectionReason.set('');
  }

  protected updateReason(event: Event): void {
    this.rejectionReason.set((event.target as HTMLTextAreaElement).value);
  }

  protected async reject(): Promise<void> {
    const post = this.rejectingPost();
    if (!post || this.reviewBusy() || this.rejectionReason().trim().length < 10) return;
    this.reviewBusy.set(true);
    try {
      const reviewed = await this.postStorage.reviewConfirmed(post.id, 'REJECTED', this.rejectionReason());
      this.feedback.set(reviewed ? 'Đã gửi yêu cầu chỉnh sửa bài viết.' : 'Chưa lưu được quyết định trên máy chủ.');
      if (reviewed) this.closeReject();
    } finally {
      this.reviewBusy.set(false);
    }
  }

  protected async removeComment(comment: MemberComment): Promise<void> {
    const removed = await this.commentStorage.moderateRemoveConfirmed(comment.id);
    this.feedback.set(removed ? 'Đã gỡ bình luận vi phạm.' : 'Bình luận không còn tồn tại.');
  }

  protected postStatusLabel(status: MemberPost['status']): string {
    return {
      DRAFT: 'Bản nháp',
      PENDING: 'Chờ duyệt',
      PUBLISHED: 'Đã xuất bản',
      REJECTED: 'Cần chỉnh sửa',
    }[status];
  }
}
