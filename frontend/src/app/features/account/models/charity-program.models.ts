export type CharitySupportType = 'MEAL' | 'FINANCIAL' | 'TRANSPORT' | 'OTHER';
export type CharityProgramStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED';
export type CharityEligibleAudience = 'PATIENT' | 'PATIENT_AND_CAREGIVER' | 'ANYONE';
export type CharityScheduleType = 'ONE_TIME' | 'WEEKLY';

export interface CharityProgramProposal {
  readonly id: string;
  readonly ownerId: string;
  readonly ownerName: string;
  readonly title: string;
  readonly supportType: CharitySupportType;
  readonly description: string;
  readonly eligibleAudience?: CharityEligibleAudience;
  readonly financialNeedRequired?: boolean;
  readonly eligibilityNote?: string;
  readonly regionId: string;
  readonly city: string;
  readonly address: string;
  readonly googlePlaceId?: string;
  readonly schedule: string;
  readonly scheduleType?: CharityScheduleType;
  readonly startsOn?: string;
  readonly endsOn?: string;
  readonly startTime?: string;
  readonly endTime?: string;
  readonly weekdays?: readonly number[];
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

export function charityProgramAddressIsUsable(address: string): boolean {
  const value = address.trim().replace(/\s+/g, ' ');
  return value.length >= 10 && /\S+\s+\S+/.test(value) && !/(.)\1{5,}/i.test(value);
}

export function charityEligibilityLabel(program: CharityProgramProposal): string {
  const audienceLabels: Record<CharityEligibleAudience, string> = {
    PATIENT: 'Bệnh nhân',
    PATIENT_AND_CAREGIVER: 'Bệnh nhân và người chăm sóc',
    ANYONE: 'Mọi người cần hỗ trợ',
  };
  const audience = program.eligibleAudience
    ? audienceLabels[program.eligibleAudience]
    : 'Chưa cập nhật đối tượng';
  return [
    audience,
    program.financialNeedRequired ? 'chỉ dành cho người có hoàn cảnh khó khăn' : '',
    program.eligibilityNote?.trim() ?? '',
  ].filter(Boolean).join(' · ');
}
