import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { HANOI_DONATION_LOCATIONS } from '../../data/hanoi-donation-locations.data';
import { CommunityLocationAdminStorageService } from '../../services/community-location-admin-storage.service';
import { CommunityHanoiDonationMapPage } from './community-hanoi-donation-map-page';

describe('CommunityHanoiDonationMapPage', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.style.overflow = '';
  });

  it('renders one Hanoi SVG map and the three Figma location markers', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityHanoiDonationMapPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CommunityHanoiDonationMapPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const map = element.querySelector<HTMLImageElement>('.hanoi-map-hero__map');
    const markers = element.querySelectorAll('.hanoi-map-hero__marker');

    expect(element.querySelectorAll('.hanoi-map-hero')).toHaveLength(1);
    expect(element.querySelectorAll('app-community-map-background')).toHaveLength(1);
    expect(map?.getAttribute('src')).toBe('/assets/images/community/community-hanoi-map.svg');
    expect(map?.classList).toContain('ui-reveal--scale');
    expect(markers).toHaveLength(3);
    expect([...markers].every((marker) => marker.classList.contains('ui-reveal--scale'))).toBe(
      true,
    );
    expect(element.querySelectorAll('app-community-location-pin')).toHaveLength(3);
  });

  it('opens the matching detail with fixed schedule and directions but no registration', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityHanoiDonationMapPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CommunityHanoiDonationMapPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const marker = element.querySelectorAll<HTMLButtonElement>('.hanoi-map-hero__marker')[2];
    marker.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('.location-dialog')).toHaveLength(1);
    expect(element.querySelector('.location-dialog')?.classList).toContain('ui-reveal--scale');
    expect(element.querySelector('.location-dialog h2')?.textContent).toContain(
      'Viện Y học phóng xạ và Ung bướu Quân đội',
    );

    const directions = element.querySelector<HTMLAnchorElement>('.location-dialog__directions');
    expect(directions?.href).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(HANOI_DONATION_LOCATIONS[2].address)}`,
    );
    expect(directions?.target).toBe('_blank');
    expect(directions?.rel).toContain('noopener');
    expect(element.textContent).toContain('không cần đăng ký trước');
    expect(element.querySelector('.location-dialog__register')).toBeNull();
  });

  it('renders only active locations assigned to the route region', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityHanoiDonationMapPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ regionId: 'hue' }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    }).compileComponents();
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    storage.save(
      HANOI_DONATION_LOCATIONS.map((item) => item.id),
      {
        ...HANOI_DONATION_LOCATIONS[0],
        id: 'hue-location',
        regionId: 'hue',
        title: 'Điểm tiếp nhận Huế',
        label: 'Điểm tiếp nhận Huế',
      },
    );
    const fixture = TestBed.createComponent(CommunityHanoiDonationMapPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.hanoi-map-hero__marker')).toHaveLength(1);
    expect(element.querySelector<HTMLImageElement>('.hanoi-map-hero__map')?.src).toContain(
      'community-region-hue.svg',
    );
    expect(element.querySelector('.hanoi-map-hero')?.getAttribute('aria-label')).toContain('Huế');
  });

  it('routes to GPS coordinates when an admin supplies both coordinates', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityHanoiDonationMapPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    storage.save(
      HANOI_DONATION_LOCATIONS.map((item) => item.id),
      { ...HANOI_DONATION_LOCATIONS[0], latitude: 21.03, longitude: 105.79 },
    );
    const fixture = TestBed.createComponent(CommunityHanoiDonationMapPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.hanoi-map-hero__marker')?.click();
    fixture.detectChanges();

    expect(element.querySelector<HTMLAnchorElement>('.location-dialog__directions')?.href).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=21.03%2C105.79',
    );
  });

  it('opens a deep-linked location after the server data arrives', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityHanoiDonationMapPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ regionId: 'hue' }),
              queryParamMap: convertToParamMap({ location: 'hue-location' }),
            },
          },
        },
      ],
    }).compileComponents();
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    const fixture = TestBed.createComponent(CommunityHanoiDonationMapPage);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.location-dialog')).toBeNull();

    storage.save(
      HANOI_DONATION_LOCATIONS.map((item) => item.id),
      {
        ...HANOI_DONATION_LOCATIONS[0],
        id: 'hue-location',
        regionId: 'hue',
        title: 'Điểm tiếp nhận Huế',
        label: 'Điểm tiếp nhận Huế',
      },
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.location-dialog h2')?.textContent,
    ).toContain('Điểm tiếp nhận Huế');
  });
});
