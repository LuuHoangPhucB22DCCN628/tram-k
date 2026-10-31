import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';

import { HANOI_DONATION_LOCATIONS } from '@features/community/data/hanoi-donation-locations.data';
import { CommunityLocationAdminStorageService } from '@features/community/services/community-location-admin-storage.service';

import { AdminCommunityLocationsPage } from './admin-community-locations-page';

describe('AdminCommunityLocationsPage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('renders locations and can hide one from the shared public data', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCommunityLocationsPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    vi.spyOn(storage, 'initializeAdmin').mockImplementation(() => storage.adminReady.set(true));
    vi.spyOn(storage, 'saveRemote').mockImplementation(async (location) => {
      storage.save(
        HANOI_DONATION_LOCATIONS.map((item) => item.id),
        location,
      );
      return true;
    });
    const fixture = TestBed.createComponent(AdminCommunityLocationsPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('tbody .location-gps--missing')?.textContent).toContain(
      'Chưa điền',
    );
    storage.save(
      HANOI_DONATION_LOCATIONS.map((item) => item.id),
      { ...HANOI_DONATION_LOCATIONS[0], latitude: 21.03, longitude: 105.79 },
    );
    fixture.detectChanges();
    const firstToggle = element.querySelectorAll<HTMLButtonElement>(
      '.location-actions button:nth-child(2)',
    )[0];
    firstToggle.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(storage.active(HANOI_DONATION_LOCATIONS)).toHaveLength(2);
    expect(element.textContent).toContain('Đã tạm ngưng tiếp nhận');
  });

  it('explains that a legacy location needs GPS before its status can change', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCommunityLocationsPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    vi.spyOn(storage, 'initializeAdmin').mockImplementation(() => storage.adminReady.set(true));
    const saveRemote = vi.spyOn(storage, 'saveRemote');
    const fixture = TestBed.createComponent(AdminCommunityLocationsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.location-actions button:nth-child(2)')?.click();
    fixture.detectChanges();

    expect(saveRemote).not.toHaveBeenCalled();
    expect(element.querySelector('.admin-locations__feedback')?.textContent).toContain(
      'chưa điền GPS',
    );
  });

  it('exposes the table as a keyboard region and closes the editor with Escape', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCommunityLocationsPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminCommunityLocationsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.location-table-wrap')?.getAttribute('tabindex')).toBe('0');
    element.querySelector<HTMLButtonElement>('.admin-locations > header button')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.location-editor')?.getAttribute('role')).toBe('dialog');
    expect(element.querySelector('[formcontrolname="schedule"]')).toBeNull();
    expect(element.querySelectorAll('.location-editor__weekdays input[type="checkbox"]')).toHaveLength(7);
    expect(
      element.querySelector<HTMLSelectElement>('.location-editor__grid select')?.options,
    ).toHaveLength(34);
    expect(
      element
        .querySelector<HTMLImageElement>('.location-editor__map-preview img')
        ?.getAttribute('src'),
    ).toBe('/assets/images/community/community-hanoi-map.svg');
    expect(element.querySelector<HTMLElement>('.location-editor__map-pin')?.style.top).toBe('50%');

    const regionSelect = element.querySelector<HTMLSelectElement>('.location-editor__grid select')!;
    regionSelect.value = 'hue';
    regionSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(
      element
        .querySelector<HTMLImageElement>('.location-editor__map-preview img')
        ?.getAttribute('src'),
    ).toBe('/assets/images/community/community-region-hue.svg');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(element.querySelector('.location-editor')).toBeNull();
  });

  it('requires both GPS coordinates and explains missing or out-of-range values before saving', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCommunityLocationsPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    vi.spyOn(storage, 'initializeAdmin').mockImplementation(() => storage.adminReady.set(true));
    const saveRemote = vi.spyOn(storage, 'saveRemote').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AdminCommunityLocationsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.admin-locations > header button')?.click();
    fixture.detectChanges();

    const page = fixture.componentInstance as unknown as {
      form: FormGroup;
      save: () => Promise<void>;
    };
    page.form.patchValue({
      title: 'Điểm tiếp nhận mới',
      description: 'Địa điểm tiếp nhận theo lịch cố định hằng tuần.',
      image: '/assets/images/community/community-location-tan-trieu.png',
      weekdays: [6], startTime: '09:00', endTime: '11:00',
      address: 'Số 1 Hà Nội',
      contactName: 'Trạm K',
      phone: '0123456789',
    });
    await page.save();
    fixture.detectChanges();

    expect(saveRemote).not.toHaveBeenCalled();
    expect(element.querySelector('#location-latitude-error')?.textContent).toContain('Chưa điền');
    expect(element.querySelector('#location-longitude-error')?.textContent).toContain('Chưa điền');
    expect(
      element
        .querySelector<HTMLInputElement>('input[formcontrolname="latitude"]')
        ?.getAttribute('required'),
    ).not.toBeNull();

    page.form.patchValue({ latitude: 21.03, longitude: 181 });
    await page.save();
    fixture.detectChanges();
    expect(saveRemote).not.toHaveBeenCalled();
    expect(element.querySelector('#location-longitude-error')?.textContent).toContain(
      '-180 đến 180',
    );

    page.form.patchValue({ longitude: 105.79 });
    await page.save();
    expect(saveRemote).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 21.03, longitude: 105.79,
        weekdays: [6], startTime: '09:00', endTime: '11:00',
        schedule: 'Thứ Bảy (hằng tuần), 09:00–11:00' }),
    );
  });

  it('names every invalid field and focuses it from the validation summary', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCommunityLocationsPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    vi.spyOn(storage, 'initializeAdmin').mockImplementation(() => storage.adminReady.set(true));
    const saveRemote = vi.spyOn(storage, 'saveRemote').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AdminCommunityLocationsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.admin-locations > header button')?.click();
    fixture.detectChanges();

    const page = fixture.componentInstance as unknown as {
      form: FormGroup;
      save: () => Promise<void>;
    };
    page.form.patchValue({
      title: 'Điểm tiếp nhận mới',
      description: '...',
      image: '/assets/images/community/community-location-tan-trieu.png',
      weekdays: [6], startTime: '09:00', endTime: '11:00',
      address: '36 Nguyễn Xiển, Hà Nội',
      contactName: 'Trạm K',
      phone: '0123456789',
      latitude: 20.9906138,
      longitude: 80.8035775,
    });
    await page.save();
    fixture.detectChanges();

    expect(saveRemote).not.toHaveBeenCalled();
    const summary = element.querySelector('.location-editor__validation');
    expect(summary?.textContent).toContain('Mô tả cần ít nhất 20 ký tự (hiện có 3).');
    expect(summary?.textContent).not.toContain('GPS');

    summary?.querySelector<HTMLButtonElement>('button')?.click();
    expect(document.activeElement).toBe(
      element.querySelector('textarea[formcontrolname="description"]'),
    );

    page.form.patchValue({
      description: 'Điểm tiếp nhận theo lịch cố định hằng tuần.',
      mapTopPercent: 101,
    });
    fixture.detectChanges();
    expect(summary?.textContent).toContain('Vị trí dọc trên bản đồ phải từ 0 đến 100%.');
    expect(summary?.textContent).not.toContain('Mô tả cần ít nhất');
  });
});
