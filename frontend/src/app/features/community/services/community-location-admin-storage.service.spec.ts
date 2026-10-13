import { TestBed } from '@angular/core/testing';

import { HANOI_DONATION_LOCATIONS } from '../data/hanoi-donation-locations.data';
import { CommunityLocationAdminStorageService } from './community-location-admin-storage.service';

describe('CommunityLocationAdminStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('hides an inactive base location from the public map without deleting it from admin data', () => {
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    const location = HANOI_DONATION_LOCATIONS[0];

    storage.save(
      HANOI_DONATION_LOCATIONS.map((item) => item.id),
      { ...location, status: 'INACTIVE' },
    );

    expect(storage.active(HANOI_DONATION_LOCATIONS).some((item) => item.id === location.id)).toBe(
      false,
    );
    expect(
      storage.resolve(HANOI_DONATION_LOCATIONS).find((item) => item.id === location.id)?.status,
    ).toBe('INACTIVE');
  });

  it('adds an active admin-created location to the public map data', () => {
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    const created = {
      ...HANOI_DONATION_LOCATIONS[0],
      id: 'diem-phat-moi',
      title: 'Điểm phát mới',
      label: 'Điểm phát mới',
    };

    storage.save(
      HANOI_DONATION_LOCATIONS.map((item) => item.id),
      created,
    );

    expect(storage.active(HANOI_DONATION_LOCATIONS)).toContainEqual(created);
  });

  it('filters active locations by region', () => {
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    const created = {
      ...HANOI_DONATION_LOCATIONS[0],
      id: 'hue-location',
      regionId: 'hue',
      title: 'Điểm tiếp nhận Huế',
      label: 'Điểm tiếp nhận Huế',
    };
    storage.save(
      HANOI_DONATION_LOCATIONS.map((item) => item.id),
      created,
    );

    expect(storage.active(HANOI_DONATION_LOCATIONS, 'hue')).toEqual([created]);
    expect(storage.active(HANOI_DONATION_LOCATIONS, 'ha-noi')).toHaveLength(3);
  });
});
