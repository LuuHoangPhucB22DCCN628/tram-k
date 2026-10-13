import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
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

  it('opens the matching Figma detail and redirects a guest to login before registration', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityHanoiDonationMapPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CommunityHanoiDonationMapPage);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
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

    element.querySelector<HTMLButtonElement>('.location-dialog__register')?.click();
    expect(navigateSpy).toHaveBeenCalledWith(['/dang-nhap'], {
      queryParams: {
        returnUrl: '/cong-dong/diem-quyen-gop/ha-noi?location=vien-y-hoc-quan-doi',
      },
    });
  });

  it('stores a member registration once and disables duplicate registration', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityHanoiDonationMapPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'currentUser').mockReturnValue({
      id: 'member-1',
      displayName: 'Thành viên',
      email: 'member@tramk.vn',
      role: 'PATIENT',
    });
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'hasRole').mockReturnValue(true);

    const fixture = TestBed.createComponent(CommunityHanoiDonationMapPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.hanoi-map-hero__marker')?.click();
    fixture.detectChanges();

    const registerButton = element.querySelector<HTMLButtonElement>('.location-dialog__register')!;
    registerButton.click();
    fixture.detectChanges();

    expect(registerButton.disabled).toBe(true);
    expect(registerButton.textContent?.trim()).toBe('Đã đăng ký');
    expect(element.textContent).toContain('Đăng ký thành công');
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
      'community-donation-map.svg',
    );
    expect(element.querySelector('.hanoi-map-hero')?.getAttribute('aria-label')).toContain('Huế');
  });
});
