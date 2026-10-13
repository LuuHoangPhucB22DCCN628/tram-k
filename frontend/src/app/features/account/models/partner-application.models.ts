export type PartnerApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PartnerApplication {
  readonly id: string;
  readonly applicantId: string;
  readonly applicantName: string;
  readonly organizationName: string;
  readonly representativeName: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  readonly introduction: string;
  readonly documentNames: readonly string[];
  readonly documents?: readonly {
    readonly storageKey: string;
    readonly originalName: string;
    readonly mimeType: string;
    readonly size: number;
  }[];
  readonly status: PartnerApplicationStatus;
  readonly reviewReason?: string;
  readonly reviewedBy?: string;
  readonly reviewedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type PartnerApplicationInput = Pick<
  PartnerApplication,
  | 'organizationName'
  | 'representativeName'
  | 'phone'
  | 'email'
  | 'address'
  | 'introduction'
  | 'documentNames'
>;
