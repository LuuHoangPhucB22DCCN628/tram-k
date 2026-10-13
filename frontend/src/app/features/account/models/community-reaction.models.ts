export type CommunityReactionType = 'LIKE' | 'LOVE' | 'SUPPORT';

export interface CommunityReaction {
  readonly id: string;
  readonly userId: string;
  readonly sourcePath: string;
  readonly type: CommunityReactionType;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type CommunityReactionCounts = Readonly<Record<CommunityReactionType, number>>;
