export type CharitySupportType = 'MEAL' | 'FINANCIAL' | 'TRANSPORT' | 'OTHER';
export type CharityProgramStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED';

export interface CharityProgramProposal {
  readonly id: string;
  readonly ownerId: string;
  readonly ownerName: string;
  readonly title: string;
  readonly supportType: CharitySupportType;
  readonly description: string;
  readonly regionId: string;
  readonly city: string;
  readonly address: string;
  readonly schedule: string;
  readonly capacity: number;
  readonly contactName: string;
  readonly phone: string;
  readonly email: string;
  readonly status: CharityProgramStatus;
  readonly reviewReason?: string;
  readonly reviewedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type CreateCharityProgramInput = Omit<
  CharityProgramProposal,
  'id' | 'ownerId' | 'ownerName' | 'status' | 'createdAt' | 'updatedAt'
>;
