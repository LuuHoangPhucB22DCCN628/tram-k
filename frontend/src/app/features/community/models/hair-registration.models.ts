export type HairRegistrationMode = 'receive' | 'donate';
export type HairRegistrationGender = 'female' | 'male' | 'other';

interface HairRegistrationContact {
  readonly fullName: string;
  readonly phone: string;
  readonly email?: string;
  readonly province: string;
  readonly district: string;
  readonly address: string;
  readonly gender: HairRegistrationGender;
}

export interface ReceiveHairRegistration extends HairRegistrationContact {
  readonly mode: 'receive';
  readonly relativePhone: string;
  readonly relativeName: string;
  readonly duration: string;
  readonly hospital: string;
  readonly diagnosis: string;
  readonly borrowDate: string;
  readonly desiredLength?: string;
  readonly transparency: string;
}

export interface DonateHairRegistration extends HairRegistrationContact {
  readonly mode: 'donate';
  readonly donationLocation: string;
  readonly donatedLength: string;
  readonly acceptedCommitments: readonly string[];
}

export type HairRegistrationRequest = ReceiveHairRegistration | DonateHairRegistration;

export interface HairRegistrationReceipt {
  readonly id: string;
  readonly status: 'PENDING';
  readonly submittedAt: string;
}

export class HairRegistrationApiError extends Error {
  constructor(
    readonly code: 'SUBMISSION_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'HairRegistrationApiError';
  }
}
