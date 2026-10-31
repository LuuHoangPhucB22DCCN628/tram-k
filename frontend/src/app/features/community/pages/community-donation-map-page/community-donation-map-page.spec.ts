import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { type DonationMapRegion, DONATION_MAP_REGIONS } from '../../data/donation-map-regions.data';
import { HANOI_DONATION_LOCATIONS } from '../../data/hanoi-donation-locations.data';
import { CommunityLocationAdminStorageService } from '../../services/community-location-admin-storage.service';
import { CommunityDonationMapPage } from './community-donation-map-page';

describe('CommunityDonationMapPage', () => {
  afterEach(() => localStorage.clear());

  it('renders the Figma map composition once with SVG assets', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityDonationMapPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CommunityDonationMapPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const map = element.querySelector<SVGElement>('.donation-map-hero__map');
    const regions = element.querySelectorAll<SVGAElement>('.donation-map-hero__region');

    expect(element.querySelectorAll('.donation-map-hero')).toHaveLength(1);
    expect(element.querySelectorAll('app-community-love-title')).toHaveLength(1);
    expect(element.querySelectorAll('app-community-map-background')).toHaveLength(1);
    expect(map?.getAttribute('viewBox')).toBe('0 0 798 800');
    expect(map?.classList).toContain('ui-reveal--scale');
    expect(DONATION_MAP_REGIONS).toHaveLength(34);
    expect(new Set(DONATION_MAP_REGIONS.map((region) => region.svgId)).size).toBe(34);
    expect(regions).toHaveLength(34);
    expect(regions[0].querySelector('use')?.getAttribute('href')).toContain(
      'community-donation-map.svg#',
    );
  });

  it('shows the matching Figma-style region dialog and Hanoi detail action', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityDonationMapPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CommunityDonationMapPage);
    const hanoi = DONATION_MAP_REGIONS.find((region) => region.id === 'ha-noi');
    expect(hanoi).toBeTruthy();

    (
      fixture.componentInstance as unknown as { selectRegion: (region: typeof hanoi) => void }
    ).selectRegion(hanoi);
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector<HTMLElement>('[role="dialog"]');
    const detailAction = element.querySelector<HTMLAnchorElement>(
      '.donation-region-dialog__button--primary',
    );
    expect(dialog?.textContent).toContain('Điểm quyên góp tại Hà Nội');
    expect(dialog?.textContent).toContain('3 điểm quyên góp đang hoạt động');
    expect(detailAction?.getAttribute('href')).toBe('/cong-dong/diem-quyen-gop/ha-noi');
  });

  it('shows an honest empty state for a region without a verified location', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityDonationMapPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CommunityDonationMapPage);
    const region = DONATION_MAP_REGIONS.find((item) => item.id === 'da-nang');
    expect(region).toBeTruthy();

    (
      fixture.componentInstance as unknown as { selectRegion: (item: typeof region) => void }
    ).selectRegion(region);
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="dialog"]')?.textContent).toContain(
      'Điểm quyên góp đang được cập nhật',
    );
    expect(
      element
        .querySelector<HTMLAnchorElement>('.donation-region-dialog__button--primary')
        ?.getAttribute('href'),
    ).toBe('/cong-dong/diem-quyen-gop/da-nang');
    expect(
      element.querySelector<HTMLImageElement>('.donation-region-dialog__visual img')?.src,
    ).toContain('community-region-da-nang.svg');
  });

  it('exposes a detail action when admin enables a location in another region', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityDonationMapPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    storage.save(
      HANOI_DONATION_LOCATIONS.map((item) => item.id),
      {
        ...HANOI_DONATION_LOCATIONS[0],
        id: 'da-nang-community-location',
        regionId: 'da-nang',
        title: 'Điểm tiếp nhận Đà Nẵng',
        label: 'Điểm tiếp nhận Đà Nẵng',
      },
    );
    const fixture = TestBed.createComponent(CommunityDonationMapPage);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      regions: () => readonly (DonationMapRegion & { readonly locationCount: number })[];
      selectRegion: (item: DonationMapRegion & { readonly locationCount: number }) => void;
    };
    const region = component.regions().find((item) => item.id === 'da-nang')!;
    component.selectRegion(region);
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="dialog"]')?.textContent).toContain(
      '1 điểm quyên góp đang hoạt động',
    );
    expect(
      element.querySelector('.donation-region-dialog__button--primary')?.getAttribute('href'),
    ).toBe('/cong-dong/diem-quyen-gop/da-nang');
  });

  it('links to the dedicated support-program page', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityDonationMapPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CommunityDonationMapPage);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '.support-programs-cta a',
    );
    expect(link?.textContent).toContain('Các chương trình hỗ trợ');
    expect(link?.getAttribute('href')).toBe('/cong-dong/chuong-trinh-ho-tro');
  });
});
