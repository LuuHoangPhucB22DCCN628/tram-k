import { DONATION_MAP_REGIONS } from './donation-map-regions.data';
import { donationMapImageForRegion } from './donation-location-map.utils';

describe('donationMapImageForRegion', () => {
  it('uses a distinct Figma map asset for every province and the detailed Hanoi map', () => {
    const images = DONATION_MAP_REGIONS.map((region) => donationMapImageForRegion(region.id));

    expect(new Set(images).size).toBe(DONATION_MAP_REGIONS.length);
    expect(images).not.toContain('/assets/images/community/community-donation-map.svg');
    expect(donationMapImageForRegion('ha-noi')).toBe(
      '/assets/images/community/community-hanoi-map.svg',
    );
  });

  it('keeps the national map only as a fallback for an unknown region', () => {
    expect(donationMapImageForRegion('khong-ton-tai')).toBe(
      '/assets/images/community/community-donation-map.svg',
    );
  });
});
