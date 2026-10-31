export interface MemberComment {
  readonly id: string;
  readonly userId: string;
  readonly authorName: string;
  readonly profileVisibility?: 'PUBLIC' | 'MEMBERS' | 'PRIVATE';
  readonly content: string;
  readonly sourceTitle: string;
  readonly sourcePath: string;
  readonly parentId?: string;
  readonly deletedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateMemberCommentInput {
  readonly authorName: string;
  readonly content: string;
  readonly sourceTitle: string;
  readonly sourcePath: string;
  readonly parentId?: string;
}
