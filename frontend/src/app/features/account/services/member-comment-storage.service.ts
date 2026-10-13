import { Injectable, signal } from '@angular/core';

import type { CreateMemberCommentInput, MemberComment } from '../models/member-comment.models';

@Injectable({ providedIn: 'root' })
export class MemberCommentStorageService {
  private readonly storageKey = 'tram-k.member-comments';
  private readonly commentsState = signal<readonly MemberComment[]>(this.read());

  readonly comments = this.commentsState.asReadonly();

  all(): readonly MemberComment[] {
    return this.commentsState()
      .filter((comment) => !comment.deletedAt)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  commentsFor(userId: string): readonly MemberComment[] {
    return this.commentsState()
      .filter((comment) => comment.userId === userId)
      .filter((comment) => !comment.deletedAt)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  commentsForSource(sourcePath: string): readonly MemberComment[] {
    return this.commentsState()
      .filter((comment) => comment.sourcePath === sourcePath)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  create(userId: string, input: CreateMemberCommentInput): MemberComment {
    if (input.parentId) {
      const parent = this.commentsState().find(
        (comment) =>
          comment.id === input.parentId &&
          comment.sourcePath === input.sourcePath &&
          !comment.parentId,
      );
      if (!parent) throw new Error('Bình luận gốc không hợp lệ.');
    }
    const now = new Date().toISOString();
    const comment: MemberComment = {
      id: `COMMENT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      authorName: input.authorName.trim(),
      content: input.content.trim(),
      sourceTitle: input.sourceTitle.trim(),
      sourcePath: input.sourcePath,
      parentId: input.parentId,
      createdAt: now,
      updatedAt: now,
    };
    this.persist([comment, ...this.commentsState()]);
    return comment;
  }

  update(userId: string, commentId: string, content: string): boolean {
    const normalizedContent = content.trim();
    if (!normalizedContent) return false;

    let updated = false;
    const comments = this.commentsState().map((comment) => {
      if (comment.id !== commentId || comment.userId !== userId || comment.deletedAt)
        return comment;
      updated = true;
      return { ...comment, content: normalizedContent, updatedAt: new Date().toISOString() };
    });
    if (updated) this.persist(comments);
    return updated;
  }

  remove(userId: string, commentId: string): boolean {
    const comments = this.commentsState();
    const canRemove = comments.some(
      (comment) => comment.id === commentId && comment.userId === userId && !comment.deletedAt,
    );
    if (!canRemove) return false;

    const now = new Date().toISOString();
    this.persist(
      comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, content: '', deletedAt: now, updatedAt: now }
          : comment,
      ),
    );
    return true;
  }

  moderateRemove(commentId: string): boolean {
    const comments = this.commentsState();
    if (!comments.some((comment) => comment.id === commentId && !comment.deletedAt)) return false;
    const now = new Date().toISOString();
    this.persist(
      comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, content: '', deletedAt: now, updatedAt: now }
          : comment,
      ),
    );
    return true;
  }

  private persist(comments: readonly MemberComment[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(comments));
    this.commentsState.set(comments);
  }

  private read(): readonly MemberComment[] {
    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) return [];
      const value: unknown = JSON.parse(rawValue);
      return Array.isArray(value) ? value.filter(this.isMemberComment) : [];
    } catch {
      return [];
    }
  }

  private readonly isMemberComment = (value: unknown): value is MemberComment => {
    if (!value || typeof value !== 'object') return false;
    const comment = value as Partial<MemberComment>;
    return (
      typeof comment.id === 'string' &&
      typeof comment.userId === 'string' &&
      typeof comment.authorName === 'string' &&
      typeof comment.content === 'string' &&
      typeof comment.sourceTitle === 'string' &&
      typeof comment.sourcePath === 'string' &&
      typeof comment.createdAt === 'string' &&
      typeof comment.updatedAt === 'string' &&
      (comment.parentId === undefined || typeof comment.parentId === 'string') &&
      (comment.deletedAt === undefined || typeof comment.deletedAt === 'string')
    );
  };
}
