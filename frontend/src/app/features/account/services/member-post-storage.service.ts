import { Injectable, signal } from '@angular/core';

import type { CreateMemberPostInput, MemberPost } from '../models/member-post.models';

@Injectable({ providedIn: 'root' })
export class MemberPostStorageService {
  private readonly storageKey = 'tram-k.member-posts';
  private readonly postsState = signal<readonly MemberPost[]>(this.read());

  readonly posts = this.postsState.asReadonly();

  all(): readonly MemberPost[] {
    return [...this.postsState()].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  postsFor(userId: string): readonly MemberPost[] {
    return this.postsState()
      .filter((post) => post.userId === userId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  create(
    userId: string,
    input: CreateMemberPostInput,
    authorName = 'Thành viên Trạm K',
  ): MemberPost {
    const now = new Date().toISOString();
    const post: MemberPost = {
      id: `POST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      authorName: authorName.trim(),
      title: input.title.trim(),
      content: input.content.trim(),
      status: input.status,
      createdAt: now,
      updatedAt: now,
    };
    this.persist([post, ...this.postsState()]);
    return post;
  }

  submit(userId: string, postId: string): boolean {
    return this.updateOwnedPost(userId, postId, (post) => ({
      ...post,
      status: 'PENDING',
      updatedAt: new Date().toISOString(),
    }));
  }

  remove(userId: string, postId: string): boolean {
    const posts = this.postsState();
    const canRemove = posts.some(
      (post) => post.id === postId && post.userId === userId && post.status !== 'PUBLISHED',
    );
    if (!canRemove) return false;

    this.persist(posts.filter((post) => post.id !== postId));
    return true;
  }

  private updateOwnedPost(
    userId: string,
    postId: string,
    update: (post: MemberPost) => MemberPost,
  ): boolean {
    let updated = false;
    const posts = this.postsState().map((post) => {
      if (
        post.id !== postId ||
        post.userId !== userId ||
        !['DRAFT', 'REJECTED'].includes(post.status)
      ) {
        return post;
      }
      updated = true;
      return { ...update(post), rejectionReason: undefined, reviewedAt: undefined };
    });
    if (updated) this.persist(posts);
    return updated;
  }

  review(
    postId: string,
    decision: Extract<MemberPost['status'], 'PUBLISHED' | 'REJECTED'>,
    reason = '',
  ): MemberPost | null {
    const normalizedReason = reason.trim();
    if (decision === 'REJECTED' && normalizedReason.length < 10) return null;

    let reviewedPost: MemberPost | null = null;
    const now = new Date().toISOString();
    const posts = this.postsState().map((post) => {
      if (post.id !== postId || post.status !== 'PENDING') return post;
      reviewedPost = {
        ...post,
        status: decision,
        rejectionReason: decision === 'REJECTED' ? normalizedReason : undefined,
        reviewedAt: now,
        updatedAt: now,
      };
      return reviewedPost;
    });
    if (reviewedPost) this.persist(posts);
    return reviewedPost;
  }

  private persist(posts: readonly MemberPost[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(posts));
    this.postsState.set(posts);
  }

  private read(): readonly MemberPost[] {
    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) return [];
      const value: unknown = JSON.parse(rawValue);
      return Array.isArray(value) ? value.filter(this.isMemberPost) : [];
    } catch {
      return [];
    }
  }

  private readonly isMemberPost = (value: unknown): value is MemberPost => {
    if (!value || typeof value !== 'object') return false;
    const post = value as Partial<MemberPost>;
    return (
      typeof post.id === 'string' &&
      typeof post.userId === 'string' &&
      typeof post.authorName === 'string' &&
      typeof post.title === 'string' &&
      typeof post.content === 'string' &&
      ['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED'].includes(post.status ?? '') &&
      typeof post.createdAt === 'string' &&
      typeof post.updatedAt === 'string'
    );
  };
}
