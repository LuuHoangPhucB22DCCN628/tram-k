import type { DonationLocationMarker } from './hanoi-donation-locations.data';
import { DONATION_MAP_REGIONS } from './donation-map-regions.data';

export function donationMapImageForRegion(regionId: string): string {
  if (regionId === 'ha-noi') return '/assets/images/community/community-hanoi-map.svg';
  if (DONATION_MAP_REGIONS.some((region) => region.id === regionId)) {
    return `/assets/images/community/community-region-${regionId}.svg`;
  }
  return '/assets/images/community/community-donation-map.svg';
}

export function donationLocationDirectionsUrl(
  location: Pick<DonationLocationMarker, 'address' | 'latitude' | 'longitude'>,
): string {
  const destination =
    location.latitude !== undefined && location.longitude !== undefined
      ? `${location.latitude},${location.longitude}`
      : location.address.trim();
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
