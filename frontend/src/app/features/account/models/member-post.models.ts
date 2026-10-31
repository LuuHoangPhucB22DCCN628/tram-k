export type MemberPostStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED';

export interface MemberPost {
  readonly id: string;
  readonly userId: string;
  readonly authorName: string;
  readonly profileVisibility?: 'PUBLIC' | 'MEMBERS' | 'PRIVATE';
  readonly title: string;
  readonly content: string;
  readonly status: MemberPostStatus;
  readonly rejectionReason?: string;
  readonly reviewedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateMemberPostInput {
  readonly title: string;
  readonly content: string;
  readonly status: Extract<MemberPostStatus, 'DRAFT' | 'PENDING'>;
}
