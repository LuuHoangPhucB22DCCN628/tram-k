import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '@core/auth/auth.service';

import type { MemberPost, MemberPostStatus } from '../../models/member-post.models';
import { MemberPostStorageService } from '../../services/member-post-storage.service';

type PostFeedback = { readonly type: 'success' | 'error'; readonly message: string };

@Component({
  selector: 'app-member-posts-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './member-posts-page.html',
  styleUrl: './member-posts-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberPostsPage {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly storage = inject(MemberPostStorageService);
  private readonly userId = this.auth.currentUser()?.id ?? '';

  protected readonly isComposerOpen = signal(false);
  protected readonly submitted = signal(false);
  protected readonly feedback = signal<PostFeedback | null>(null);
  protected readonly saving = signal(false);
  protected readonly loading = this.storage.mineLoading;
  protected readonly migrationWarning = this.storage.migrationWarning;
  protected readonly posts = computed(() => this.storage.postsFor(this.userId));
  protected readonly postForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
    content: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(5000)]],
  });

  constructor() {
    void this.storage.initializeMine(this.userId);
  }

  protected openComposer(): void {
    this.isComposerOpen.set(true);
    this.feedback.set(null);
  }

  protected closeComposer(): void {
    this.isComposerOpen.set(false);
    this.submitted.set(false);
    this.postForm.reset();
  }

  protected async save(status: Extract<MemberPostStatus, 'DRAFT' | 'PENDING'>): Promise<void> {
    if (this.saving() || this.loading()) return;
    this.submitted.set(true);
    this.feedback.set(null);
    if (!this.userId || this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    try {
      const post = await this.storage.createConfirmed(
        this.userId, { ...this.postForm.getRawValue(), status }, this.auth.currentUser()?.displayName,
      );
      if (!post) {
        this.feedback.set({ type: 'error', message: 'Chưa lưu được bài viết lên máy chủ. Vui lòng thử lại.' });
        return;
      }
      this.closeComposer();
      this.feedback.set({
        type: 'success',
        message: status === 'DRAFT' ? 'Đã lưu bài viết vào bản nháp.' : 'Đã gửi bài viết để duyệt.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  protected async submitPost(post: MemberPost): Promise<void> {
    if (this.saving() || this.loading()) return;
    this.saving.set(true);
    try {
      const submitted = await this.storage.submitConfirmed(this.userId, post.id);
      this.feedback.set(submitted
        ? { type: 'success', message: 'Đã gửi bài viết để duyệt.' }
        : { type: 'error', message: 'Chưa gửi được bài viết lên máy chủ. Vui lòng thử lại.' });
    } finally {
      this.saving.set(false);
    }
  }

  protected async removePost(post: MemberPost): Promise<void> {
    if (this.saving() || this.loading()) return;
    this.saving.set(true);
    try {
      const removed = await this.storage.removeConfirmed(this.userId, post.id);
      this.feedback.set(removed
        ? { type: 'success', message: 'Đã xóa bài viết.' }
        : { type: 'error', message: 'Chưa xóa được bài viết hoặc bài đã xuất bản.' });
    } finally {
      this.saving.set(false);
    }
  }

  protected statusLabel(status: MemberPostStatus): string {
    return {
      DRAFT: 'Bản nháp',
      PENDING: 'Chờ duyệt',
      PUBLISHED: 'Đã xuất bản',
      REJECTED: 'Cần chỉnh sửa',
    }[status];
  }

  protected hasError(field: 'title' | 'content'): boolean {
    const control = this.postForm.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }
}
