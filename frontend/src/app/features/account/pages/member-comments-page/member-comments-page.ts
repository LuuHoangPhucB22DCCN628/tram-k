import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';

import type { MemberComment } from '../../models/member-comment.models';
import { MemberCommentStorageService } from '../../services/member-comment-storage.service';

type CommentFeedback = { readonly type: 'success' | 'error'; readonly message: string };

@Component({
  selector: 'app-member-comments-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './member-comments-page.html',
  styleUrl: './member-comments-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberCommentsPage {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly storage = inject(MemberCommentStorageService);
  private readonly userId = this.auth.currentUser()?.id ?? '';

  protected readonly editingId = signal<string | null>(null);
  protected readonly feedback = signal<CommentFeedback | null>(null);
  protected readonly comments = computed(() => this.storage.commentsFor(this.userId));
  protected readonly editForm = this.formBuilder.nonNullable.group({
    content: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(1000)]],
  });

  protected startEditing(comment: MemberComment): void {
    this.editingId.set(comment.id);
    this.editForm.setValue({ content: comment.content });
    this.feedback.set(null);
  }

  protected cancelEditing(): void {
    this.editingId.set(null);
    this.editForm.reset();
  }

  protected save(comment: MemberComment): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const updated = this.storage.update(
      this.userId,
      comment.id,
      this.editForm.controls.content.value,
    );
    if (!updated) {
      this.feedback.set({ type: 'error', message: 'Không thể cập nhật bình luận này.' });
      return;
    }
    this.cancelEditing();
    this.feedback.set({ type: 'success', message: 'Đã cập nhật bình luận.' });
  }

  protected remove(comment: MemberComment): void {
    if (!this.storage.remove(this.userId, comment.id)) {
      this.feedback.set({ type: 'error', message: 'Không thể xóa bình luận này.' });
      return;
    }
    if (this.editingId() === comment.id) this.cancelEditing();
    this.feedback.set({ type: 'success', message: 'Đã xóa bình luận.' });
  }

  protected wasEdited(comment: MemberComment): boolean {
    return comment.updatedAt !== comment.createdAt;
  }
}
