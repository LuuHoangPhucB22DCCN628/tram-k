import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';
import { MemberPostApiService } from './member-post-api.service';

import type { CreateMemberPostInput, MemberPost } from '../models/member-post.models';

@Injectable({ providedIn: 'root' })
export class MemberPostStorageService {
  private readonly storageKey = 'tram-k.member-posts';
  private readonly auth = inject(AuthService);
  private readonly api = inject(MemberPostApiService);
  private readonly postsState = signal<readonly MemberPost[]>(this.read());
  private readonly publicState = signal<readonly MemberPost[]>([]);
  private readonly mineLoadingState = signal(false);
  private readonly migrationWarningState = signal(false);
  private readonly initializedMine = new Set<string>();
  private adminInitialized = false;
  private publicInitialized = false;

  readonly posts = this.postsState.asReadonly();
  readonly mineLoading = this.mineLoadingState.asReadonly();
  readonly migrationWarning = this.migrationWarningState.asReadonly();
  readonly publishedPosts = computed(() => this.api.available
    ? this.publicState()
    : this.postsState().filter((post) => post.status === 'PUBLISHED'));

  initializePublic(): void {
    if (this.publicInitialized || !this.api.available) return;
    this.publicInitialized = true;
    this.api.publicPosts().subscribe((posts) => {
      if (posts) this.publicState.set(posts);
      this.publicInitialized = false;
    });
  }

  async initializeMine(userId: string): Promise<void> {
    if (!this.remoteEnabled() || !userId || this.initializedMine.has(userId)) return;
    this.initializedMine.add(userId);
    this.mineLoadingState.set(true);
    const legacy = this.read().filter((post) => post.userId === userId);
    const migratedIds = new Set<string>();
    try {
      for (const post of legacy) {
        const migrated = await firstValueFrom(this.api.create({
          title: post.title, content: post.content,
          status: post.status === 'DRAFT' ? 'DRAFT' : 'PENDING',
          legacyId: post.id,
        }));
        if (migrated) migratedIds.add(post.id);
      }
      const remote = await firstValueFrom(this.api.mine());
      if (!remote) throw new Error('load');
      const remoteIds = new Set(remote.map((post) => post.id));
      const failedLegacy = legacy.filter((post) => !migratedIds.has(post.id) && !remoteIds.has(post.id));
      this.migrationWarningState.set(failedLegacy.length > 0);
      this.postsState.set([...this.postsState().filter((post) => post.userId !== userId), ...remote, ...failedLegacy]);
      if (migratedIds.size) {
        const remaining = this.read().filter((post) => !migratedIds.has(post.id));
        if (remaining.length) localStorage.setItem(this.storageKey, JSON.stringify(remaining));
        else localStorage.removeItem(this.storageKey);
      }
    } catch {
      this.migrationWarningState.set(true);
    } finally {
      this.mineLoadingState.set(false);
      this.initializedMine.delete(userId);
    }
  }

  initializeAdmin(): void {
    if (!this.remoteEnabled() || this.adminInitialized) return;
    this.adminInitialized = true;
    this.api.admin().subscribe((posts) => {
      if (posts) this.postsState.set(posts);
      this.adminInitialized = false;
    });
  }

  async createConfirmed(userId: string, input: CreateMemberPostInput, authorName = 'Thành viên Trạm K'): Promise<MemberPost | null> {
    if (!this.remoteEnabled()) return this.create(userId, input, authorName);
    if (this.auth.currentUser()?.id !== userId) return null;
    const post = await firstValueFrom(this.api.create(input));
    if (post) this.postsState.update((posts) => [post, ...posts]);
    return post;
  }

  async submitConfirmed(userId: string, postId: string): Promise<boolean> {
    if (!this.remoteEnabled()) return this.submit(userId, postId);
    if (this.auth.currentUser()?.id !== userId) return false;
    const post = await firstValueFrom(this.api.submit(postId));
    if (post) this.postsState.update((posts) => posts.map((item) => item.id === postId ? post : item));
    return !!post;
  }

  async removeConfirmed(userId: string, postId: string): Promise<boolean> {
    if (!this.remoteEnabled()) return this.remove(userId, postId);
    if (this.auth.currentUser()?.id !== userId) return false;
    const removed = await firstValueFrom(this.api.remove(postId));
    if (removed) this.postsState.update((posts) => posts.filter((item) => item.id !== postId));
    return removed;
  }

  async reviewConfirmed(postId: string, decision: 'PUBLISHED' | 'REJECTED', reason = ''): Promise<MemberPost | null> {
    if (!this.remoteEnabled()) return this.review(postId, decision, reason);
    const post = await firstValueFrom(this.api.review(postId, decision, reason));
    if (post) {
      this.postsState.update((posts) => posts.map((item) => item.id === postId ? post : item));
      if (post.status === 'PUBLISHED') this.publicState.update((posts) => [post, ...posts.filter((item) => item.id !== post.id)]);
    }
    return post;
  }

  private remoteEnabled(): boolean {
    return this.api.available && this.auth.authMode() === 'REMOTE';
  }

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
