import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';
import { CommunityEngagementApiService } from './community-engagement-api.service';

import type { CreateMemberCommentInput, MemberComment } from '../models/member-comment.models';

@Injectable({ providedIn: 'root' })
export class MemberCommentStorageService {
  private readonly storageKey = 'tram-k.member-comments';
  private readonly auth = inject(AuthService);
  private readonly api = inject(CommunityEngagementApiService);
  private readonly commentsState = signal<readonly MemberComment[]>(this.read());
  private readonly remoteComments = signal<Record<string, readonly MemberComment[]>>({});
  private readonly remoteAdminComments = signal<readonly MemberComment[]>([]);
  private readonly remoteMineComments = signal<readonly MemberComment[]>([]);
  private mineInitialized = false;
  private adminInitialized = false;
  private readonly loadedSources = new Set<string>();

  readonly comments = this.commentsState.asReadonly();

  lastCreateError(): string {
    return this.api.lastCommentError?.() ?? '';
  }

  legacyCountFor(userId: string): number {
    return this.commentsState().filter((comment) => comment.userId === userId &&
      comment.id.startsWith('COMMENT-') && !comment.deletedAt).length;
  }

  async migrateLegacyFor(userId: string): Promise<{ migrated: number; remaining: number }> {
    if (!this.remoteEnabled() || this.auth.currentUser()?.id !== userId) {
      return { migrated: 0, remaining: this.legacyCountFor(userId) };
    }
    const pending = this.commentsState()
      .filter((comment) => comment.userId === userId && comment.id.startsWith('COMMENT-') && !comment.deletedAt)
      .sort((a, b) => Number(!!a.parentId) - Number(!!b.parentId) || a.createdAt.localeCompare(b.createdAt));
    const migratedIds = new Map<string, string>();
    let migrated = 0;
    for (const comment of pending) {
      const sourceKey = this.storyKeyFromPath(comment.sourcePath);
      const parentId = comment.parentId
        ? (comment.parentId.startsWith('COMMENT-') ? migratedIds.get(comment.parentId) : comment.parentId)
        : undefined;
      if (!sourceKey || (comment.parentId && !parentId)) continue;
      const saved = await firstValueFrom(this.api.createComment(sourceKey, {
        content: comment.content, sourceTitle: comment.sourceTitle, sourcePath: comment.sourcePath,
        parentId, idempotencyKey: `legacy:${comment.id}`,
      }));
      if (!saved) continue;
      migratedIds.set(comment.id, saved.id);
      this.remoteMineComments.update((current) => current.some((item) => item.id === saved.id)
        ? current : [saved, ...current]);
      this.remoteComments.update((state) => ({
        ...state,
        [saved.sourcePath]: (state[saved.sourcePath] ?? []).some((item) => item.id === saved.id)
          ? state[saved.sourcePath] : [...(state[saved.sourcePath] ?? []), saved],
      }));
      this.persist(this.commentsState().filter((item) => item.id !== comment.id));
      migrated += 1;
    }
    return { migrated, remaining: this.legacyCountFor(userId) };
  }

  private storyKeyFromPath(path: string): string | null {
    try {
      const url = new URL(path, 'http://localhost');
      return url.pathname === '/goc-tam-ly' ? url.searchParams.get('story') : null;
    } catch { return null; }
  }

  all(): readonly MemberComment[] {
    return (this.remoteEnabled() ? this.remoteAdminComments() : this.commentsState())
      .filter((comment) => !comment.deletedAt)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  initializeAdmin(): void {
    if (!this.remoteEnabled() || this.adminInitialized) return;
    this.adminInitialized = true;
    this.api.adminComments().subscribe((comments) => {
      if (comments) this.remoteAdminComments.set(comments);
      this.adminInitialized = false;
    });
  }

  async moderateRemoveConfirmed(commentId: string): Promise<boolean> {
    if (!this.remoteEnabled()) return this.moderateRemove(commentId);
    const removed = await firstValueFrom(this.api.moderateRemoveComment(commentId));
    if (removed) this.remoteAdminComments.update((comments) => comments.filter((comment) => comment.id !== commentId));
    return removed;
  }

  commentsFor(userId: string): readonly MemberComment[] {
    const comments = this.remoteEnabled()
      ? [...this.remoteMineComments(), ...this.commentsState().filter((comment) => comment.id.startsWith('COMMENT-'))]
      : this.commentsState();
    return comments
      .filter((comment) => comment.userId === userId)
      .filter((comment) => !comment.deletedAt)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  initializeMine(): void {
    if (!this.remoteEnabled() || this.mineInitialized) return;
    this.mineInitialized = true;
    this.api.mineComments().subscribe((comments) => {
      if (comments) this.remoteMineComments.set(comments);
      this.mineInitialized = false;
    });
  }

  commentsForSource(sourcePath: string): readonly MemberComment[] {
    const comments = this.api.available
      ? [...(this.remoteComments()[sourcePath] ?? []), ...this.commentsState().filter((comment) =>
        comment.id.startsWith('COMMENT-') && comment.userId === this.auth.currentUser()?.id)]
      : this.commentsState();
    return comments
      .filter((comment) => comment.sourcePath === sourcePath)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  initializeForSource(sourceKey: string, sourcePath: string, force = false): void {
    if (!this.api.available || (this.loadedSources.has(sourceKey) && !force)) return;
    this.loadedSources.add(sourceKey);
    this.api.listComments(sourceKey).subscribe((comments) => {
      if (comments) this.remoteComments.update((state) => ({ ...state, [sourcePath]: comments }));
      else this.loadedSources.delete(sourceKey);
    });
  }

  async createConfirmed(userId: string, sourceKey: string, input: CreateMemberCommentInput): Promise<boolean> {
    if (!this.remoteEnabled()) {
      this.create(userId, input);
      return true;
    }
    const comment = await firstValueFrom(this.api.createComment(sourceKey, input));
    if (!comment) return false;
    const withAuthor = { ...comment, authorName: this.auth.currentUser()?.displayName ?? comment.authorName };
    this.remoteComments.update((state) => ({
      ...state, [input.sourcePath]: [...(state[input.sourcePath] ?? []), withAuthor],
    }));
    this.remoteMineComments.update((comments) => [withAuthor, ...comments]);
    return true;
  }

  async updateConfirmed(userId: string, commentId: string, content: string): Promise<boolean> {
    if (!this.remoteEnabled() || commentId.startsWith('COMMENT-')) return this.update(userId, commentId, content);
    const updated = await firstValueFrom(this.api.updateComment(commentId, content));
    if (!updated) return false;
    this.remoteComments.update((state) => Object.fromEntries(Object.entries(state).map(([path, comments]) => [
      path, comments.map((comment) => comment.id === commentId ? { ...comment, content: updated.content, updatedAt: updated.updatedAt } : comment),
    ])));
    this.remoteMineComments.update((comments) => comments.map((comment) => comment.id === commentId
      ? { ...comment, content: updated.content, updatedAt: updated.updatedAt } : comment));
    return true;
  }

  async removeConfirmed(userId: string, commentId: string): Promise<boolean> {
    if (!this.remoteEnabled() || commentId.startsWith('COMMENT-')) return this.remove(userId, commentId);
    const removed = await firstValueFrom(this.api.removeComment(commentId));
    if (!removed) return false;
    this.remoteComments.update((state) => Object.fromEntries(Object.entries(state).map(([path, comments]) => [
      path, comments.map((comment) => comment.id === commentId ? { ...comment, content: '', deletedAt: new Date().toISOString() } : comment),
    ])));
    this.remoteMineComments.update((comments) => comments.filter((comment) => comment.id !== commentId));
    return true;
  }

  private remoteEnabled(): boolean {
    return this.api.available && this.auth.authMode() === 'REMOTE';
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
