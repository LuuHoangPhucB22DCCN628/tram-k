export interface DonationMapRegion {
  readonly id: string;
  readonly svgId: string;
  readonly name: string;
}

export declare const DONATION_MAP_REGIONS: readonly DonationMapRegion[];

export interface DonationLocationMarker {
  readonly id: string;
  readonly regionId: string;
  readonly label: string;
  readonly title: string;
  readonly image: string;
  readonly description: readonly string[];
  readonly summary?: string;
  readonly emphasis?: string;
  readonly schedule: string;
  readonly weekdays?: readonly number[];
  readonly startTime?: string;
  readonly endTime?: string;
  readonly address: string;
  readonly contactName: string;
  readonly phone: string;
  readonly status: "ACTIVE" | "INACTIVE";
  readonly mapTopPercent: number;
  readonly mapLeftPercent: number;
  readonly latitude?: number;
  readonly longitude?: number;
}

export declare const HANOI_DONATION_LOCATIONS: readonly (DonationLocationMarker & {
  readonly summary: string;
})[];
