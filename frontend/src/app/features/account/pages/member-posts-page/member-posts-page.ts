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
  protected readonly posts = computed(() => this.storage.postsFor(this.userId));
  protected readonly postForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
    content: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(5000)]],
  });

  protected openComposer(): void {
    this.isComposerOpen.set(true);
    this.feedback.set(null);
  }

  protected closeComposer(): void {
    this.isComposerOpen.set(false);
    this.submitted.set(false);
    this.postForm.reset();
  }

  protected save(status: Extract<MemberPostStatus, 'DRAFT' | 'PENDING'>): void {
    this.submitted.set(true);
    this.feedback.set(null);
    if (!this.userId || this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      return;
    }

    this.storage.create(
      this.userId,
      { ...this.postForm.getRawValue(), status },
      this.auth.currentUser()?.displayName,
    );
    this.closeComposer();
    this.feedback.set({
      type: 'success',
      message: status === 'DRAFT' ? 'Đã lưu bài viết vào bản nháp.' : 'Đã gửi bài viết để duyệt.',
    });
  }

  protected submitPost(post: MemberPost): void {
    if (!this.storage.submit(this.userId, post.id)) return;
    this.feedback.set({ type: 'success', message: 'Đã gửi bài viết để duyệt.' });
  }

  protected removePost(post: MemberPost): void {
    if (!this.storage.remove(this.userId, post.id)) {
      this.feedback.set({ type: 'error', message: 'Không thể xóa bài viết đã xuất bản.' });
      return;
    }
    this.feedback.set({ type: 'success', message: 'Đã xóa bài viết.' });
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
