import { DONATION_MAP_REGIONS } from '@tram-k/support-data';

export { DONATION_MAP_REGIONS };
export type { DonationMapRegion } from '@tram-k/support-data';

export function donationRegionIdFromName(value: string): string | null {
  const normalizedValue = normalizeRegionName(value);
  return (
    DONATION_MAP_REGIONS.find((region) => {
      const normalizedName = normalizeRegionName(region.name);
      return normalizedValue === normalizedName || normalizedValue.includes(normalizedName);
    })?.id ?? null
  );
}

function normalizeRegionName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/^(thanh pho|tinh)\s+/, '')
    .trim();
}
