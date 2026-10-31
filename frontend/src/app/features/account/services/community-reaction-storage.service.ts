import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';
import { CommunityEngagementApiService } from './community-engagement-api.service';

import type {
  CommunityReaction,
  CommunityReactionCounts,
  CommunityReactionType,
} from '../models/community-reaction.models';

@Injectable({ providedIn: 'root' })
export class CommunityReactionStorageService {
  private readonly storageKey = 'tram-k.community-reactions';
  private readonly auth = inject(AuthService);
  private readonly api = inject(CommunityEngagementApiService);
  private readonly reactionsState = signal<readonly CommunityReaction[]>(this.read());
  private readonly remoteCounts = signal<Record<string, CommunityReactionCounts>>({});
  private readonly remoteMine = signal<Record<string, CommunityReactionType | null>>({});
  private readonly loadedSources = new Set<string>();

  readonly reactions = this.reactionsState.asReadonly();

  legacyCountFor(userId: string): number {
    return this.reactionsState().filter((reaction) => reaction.userId === userId).length;
  }

  async migrateLegacyFor(userId: string): Promise<{ migrated: number; remaining: number }> {
    if (!this.api.available || this.auth.authMode() !== 'REMOTE' || this.auth.currentUser()?.id !== userId) {
      return { migrated: 0, remaining: this.legacyCountFor(userId) };
    }
    let migrated = 0;
    for (const reaction of this.reactionsState().filter((item) => item.userId === userId)) {
      let sourceKey: string | null = null;
      try {
        const url = new URL(reaction.sourcePath, 'http://localhost');
        if (url.pathname === '/goc-tam-ly') sourceKey = url.searchParams.get('story');
      } catch { /* Keep invalid legacy records local. */ }
      if (!sourceKey) continue;
      const restored = await firstValueFrom(this.api.importReaction(sourceKey, reaction.type));
      if (!restored) continue;
      this.remoteMine.update((state) => ({ ...state, [reaction.sourcePath]: restored }));
      const counts = await firstValueFrom(this.api.reactionSummary(sourceKey));
      if (counts) this.remoteCounts.update((state) => ({ ...state, [reaction.sourcePath]: counts }));
      this.persist(this.reactionsState().filter((item) => item.id !== reaction.id));
      migrated += 1;
    }
    return { migrated, remaining: this.legacyCountFor(userId) };
  }

  reactionFor(userId: string, sourcePath: string): CommunityReactionType | null {
    if (this.api.available) return this.remoteMine()[sourcePath] ?? null;
    return (
      this.reactionsState().find(
        (reaction) => reaction.userId === userId && reaction.sourcePath === sourcePath,
      )?.type ?? null
    );
  }

  countsFor(sourcePath: string): CommunityReactionCounts {
    if (this.api.available) return this.remoteCounts()[sourcePath] ?? { LIKE: 0, LOVE: 0, SUPPORT: 0 };
    const counts: Record<CommunityReactionType, number> = { LIKE: 0, LOVE: 0, SUPPORT: 0 };
    this.reactionsState().forEach((reaction) => {
      if (reaction.sourcePath === sourcePath) counts[reaction.type] += 1;
    });
    return counts;
  }

  initializeForSource(sourceKey: string, sourcePath: string, force = false): void {
    if (!this.api.available || (this.loadedSources.has(sourceKey) && !force)) return;
    this.loadedSources.add(sourceKey);
    this.api.reactionSummary(sourceKey).subscribe((counts) => {
      if (counts) this.remoteCounts.update((state) => ({ ...state, [sourcePath]: counts }));
      else this.loadedSources.delete(sourceKey);
    });
    if (this.auth.authMode() === 'REMOTE') {
      this.api.myReaction(sourceKey).subscribe((type) => {
        this.remoteMine.update((state) => ({ ...state, [sourcePath]: type }));
      });
    }
  }

  async toggleConfirmed(userId: string, sourceKey: string, sourcePath: string, type: CommunityReactionType): Promise<boolean> {
    if (!this.api.available || this.auth.authMode() !== 'REMOTE') {
      this.toggle(userId, sourcePath, type);
      return true;
    }
    const selected = await firstValueFrom(this.api.toggleReaction(sourceKey, type));
    if (selected === false) return false;
    this.remoteMine.update((state) => ({ ...state, [sourcePath]: selected }));
    const counts = await firstValueFrom(this.api.reactionSummary(sourceKey));
    if (counts) this.remoteCounts.update((state) => ({ ...state, [sourcePath]: counts }));
    return true;
  }

  toggle(
    userId: string,
    sourcePath: string,
    type: CommunityReactionType,
  ): CommunityReactionType | null {
    const existing = this.reactionsState().find(
      (reaction) => reaction.userId === userId && reaction.sourcePath === sourcePath,
    );
    if (existing?.type === type) {
      this.persist(this.reactionsState().filter((reaction) => reaction.id !== existing.id));
      return null;
    }
    const now = new Date().toISOString();
    if (existing) {
      this.persist(
        this.reactionsState().map((reaction) =>
          reaction.id === existing.id ? { ...reaction, type, updatedAt: now } : reaction,
        ),
      );
      return type;
    }
    this.persist([
      {
        id: `REACTION-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId,
        sourcePath,
        type,
        createdAt: now,
        updatedAt: now,
      },
      ...this.reactionsState(),
    ]);
    return type;
  }

  private persist(reactions: readonly CommunityReaction[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(reactions));
    this.reactionsState.set(reactions);
  }

  private read(): readonly CommunityReaction[] {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(this.storageKey) ?? '[]');
      return Array.isArray(value) ? value.filter(this.isReaction) : [];
    } catch {
      return [];
    }
  }

  private isReaction(value: unknown): value is CommunityReaction {
    if (!value || typeof value !== 'object') return false;
    const reaction = value as Partial<CommunityReaction>;
    return (
      typeof reaction.id === 'string' &&
      typeof reaction.userId === 'string' &&
      typeof reaction.sourcePath === 'string' &&
      ['LIKE', 'LOVE', 'SUPPORT'].includes(reaction.type ?? '') &&
      typeof reaction.createdAt === 'string' &&
      typeof reaction.updatedAt === 'string'
    );
  }
}
