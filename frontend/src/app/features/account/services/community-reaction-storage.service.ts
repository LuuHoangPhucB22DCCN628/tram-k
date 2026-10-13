import { Injectable, signal } from '@angular/core';

import type {
  CommunityReaction,
  CommunityReactionCounts,
  CommunityReactionType,
} from '../models/community-reaction.models';

@Injectable({ providedIn: 'root' })
export class CommunityReactionStorageService {
  private readonly storageKey = 'tram-k.community-reactions';
  private readonly reactionsState = signal<readonly CommunityReaction[]>(this.read());

  readonly reactions = this.reactionsState.asReadonly();

  reactionFor(userId: string, sourcePath: string): CommunityReactionType | null {
    return (
      this.reactionsState().find(
        (reaction) => reaction.userId === userId && reaction.sourcePath === sourcePath,
      )?.type ?? null
    );
  }

  countsFor(sourcePath: string): CommunityReactionCounts {
    const counts: Record<CommunityReactionType, number> = { LIKE: 0, LOVE: 0, SUPPORT: 0 };
    this.reactionsState().forEach((reaction) => {
      if (reaction.sourcePath === sourcePath) counts[reaction.type] += 1;
    });
    return counts;
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
