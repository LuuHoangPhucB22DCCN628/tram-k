import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '@core/config/api-base-url.token';
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

describe('CommunityLocationAdminStorageService server sync', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('loads server locations for the public regional map', () => {
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    const location = {
      ...HANOI_DONATION_LOCATIONS[0],
      id: 'hue-center',
      regionId: 'hue',
      title: 'Điểm tiếp nhận Huế',
      label: 'Điểm tiếp nhận Huế',
    };
    storage.initializePublic();
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:3000/managed-resources/public-state?type=DONATION_LOCATION')
      .flush({ success: true, data: { initialized: true, items: [{ payload: location }] } });

    expect(storage.active(HANOI_DONATION_LOCATIONS, 'hue')).toEqual([location]);
  });

  it('waits for a successful server write before updating the map', async () => {
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    const http = TestBed.inject(HttpTestingController);
    storage.initializeAdmin();
    http
      .expectOne('http://localhost:3000/managed-resources/admin-state?type=DONATION_LOCATION')
      .flush({ success: true, data: { initialized: false, items: [] } });
    await Promise.resolve();

    const location = { ...HANOI_DONATION_LOCATIONS[0], status: 'INACTIVE' as const };
    const result = storage.saveRemote(location);
    expect(storage.active(HANOI_DONATION_LOCATIONS)).toHaveLength(3);
    const request = http.expectOne(
      'http://localhost:3000/managed-resources/DONATION_LOCATION/tan-trieu',
    );
    expect(request.request.body.payload.status).toBe('INACTIVE');
    request.flush({ success: true, data: { sourceId: 'tan-trieu' } });

    await expect(result).resolves.toBe(true);
    expect(storage.active(HANOI_DONATION_LOCATIONS)).toHaveLength(2);
  });

  it('migrates previous browser-only locations without deleting them before server success', async () => {
    const oldLocation = {
      ...HANOI_DONATION_LOCATIONS[0],
      id: 'old-location',
      title: 'Điểm cũ',
      label: 'Điểm cũ',
    };
    localStorage.setItem(
      'tram-k.community-location-admin-state',
      JSON.stringify({ overrides: {}, created: [oldLocation] }),
    );
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    const http = TestBed.inject(HttpTestingController);
    storage.initializeAdmin();
    http
      .expectOne('http://localhost:3000/managed-resources/admin-state?type=DONATION_LOCATION')
      .flush({ success: true, data: { initialized: false, items: [] } });
    const request = http.expectOne(
      'http://localhost:3000/managed-resources/DONATION_LOCATION/old-location',
    );
    expect(localStorage.getItem('tram-k.community-location-admin-state')).not.toBeNull();
    request.flush({ success: true, data: { sourceId: 'old-location' } });
    await vi.waitFor(() => expect(storage.adminReady()).toBe(true));

    expect(localStorage.getItem('tram-k.community-location-admin-state')).toBeNull();
    expect(storage.active(HANOI_DONATION_LOCATIONS)).toContainEqual(oldLocation);
  });
});
