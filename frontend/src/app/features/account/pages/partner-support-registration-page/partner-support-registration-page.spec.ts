import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { CharityProgramStorageService } from '../../services/charity-program-storage.service';

import { PartnerSupportRegistrationPage } from './partner-support-registration-page';

describe('PartnerSupportRegistrationPage', () => {
  const user = signal({ id: 'PARTNER-1', role: 'PARTNER', displayName: 'Nhà hảo tâm', email: 'partner@example.com' });
  const storage = { proposalFor: vi.fn(() => null), create: vi.fn() };

  beforeEach(async () => {
    storage.create.mockReset();
    storage.create.mockReturnValue({ id: 'PROGRAM-1' });
    await TestBed.configureTestingModule({
      imports: [PartnerSupportRegistrationPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: user.asReadonly() } },
        { provide: CharityProgramStorageService, useValue: storage },
      ],
    }).compileComponents();
  });

  it('rejects a placeholder address and submits a specific one with the chosen region', () => {
    const fixture = TestBed.createComponent(PartnerSupportRegistrationPage);
    const page = fixture.componentInstance as unknown as { form: FormGroup; submit(): void };
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.form.setValue({
      title: 'Bữa cơm yêu thương', supportType: 'MEAL',
      description: 'Phát suất ăn miễn phí cho bệnh nhân đang điều trị tại bệnh viện.',
      eligibleAudience: 'PATIENT', financialNeedRequired: false, eligibilityNote: '',
      regionId: 'cao-bang', address: 'dddddddddddddd',
      scheduleType: 'ONE_TIME', startsOn: '2099-10-24', endsOn: '', startTime: '09:00', endTime: '11:00',
      capacity: 30, contactName: 'Minh Anh', phone: '0912345678', email: 'partner@example.com',
    });
    page.submit();
    fixture.detectChanges();
    expect(storage.create).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('không dùng ký tự lặp');

    page.form.controls['address'].setValue('Bệnh viện Đa khoa tỉnh Cao Bằng');
    page.submit();
    expect(storage.create).toHaveBeenCalledWith('PARTNER-1', 'Nhà hảo tâm', expect.objectContaining({
      address: 'Bệnh viện Đa khoa tỉnh Cao Bằng', city: 'Cao Bằng',
      scheduleType: 'ONE_TIME', startsOn: '2099-10-24', startTime: '09:00', endTime: '11:00',
    }));
  });

  it('copies a selected Google place into the address and retains its Place ID', async () => {
    const fixture = TestBed.createComponent(PartnerSupportRegistrationPage);
    const page = fixture.componentInstance as unknown as {
      form: FormGroup;
      googlePlaceId(): string;
      applyGooglePlace(place: {
        id: string; displayName: string; formattedAddress: string;
        fetchFields(options: { fields: string[] }): Promise<void>;
      }): Promise<void>;
    };
    page.form.controls['regionId'].setValue('cao-bang');
    (page as unknown as { openAddressPicker(): void }).openAddressPicker();
    await page.applyGooglePlace({
      id: 'ChIJ-example',
      displayName: 'Bệnh viện Đa khoa tỉnh Cao Bằng',
      formattedAddress: 'Đường Đông Khê, Cao Bằng, Việt Nam',
      fetchFields: vi.fn().mockResolvedValue(undefined),
    });

    expect(page.form.controls['address'].value).toContain('Bệnh viện Đa khoa tỉnh Cao Bằng');
    expect(page.googlePlaceId()).toBe('ChIJ-example');
  });

  it('chooses an address in two steps and restores the previous value on cancel', () => {
    const fixture = TestBed.createComponent(PartnerSupportRegistrationPage);
    const page = fixture.componentInstance as unknown as {
      form: FormGroup;
      addressPickerOpen(): boolean;
      openAddressPicker(): void;
      chooseRegion(regionId: string): void;
      cancelAddressPicker(): void;
      confirmAddressPicker(): void;
    };
    fixture.detectChanges();
    page.openAddressPicker();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="dialog"]')).not.toBeNull();
    expect(element.querySelector('#program-region-search')).not.toBeNull();
    page.chooseRegion('ha-noi');
    fixture.detectChanges();
    expect(element.querySelector('#program-address')).not.toBeNull();
    page.form.controls['address'].setValue('Bệnh viện K Tân Triều, phường Thanh Liệt');
    fixture.detectChanges();
    expect(element.querySelector('.support-form__address-preview')?.textContent).toContain('Bệnh viện K');
    page.cancelAddressPicker();
    expect(page.form.controls['regionId'].value).toBe('');
    expect(page.form.controls['address'].value).toBe('');

    page.openAddressPicker();
    page.chooseRegion('ha-noi');
    page.form.controls['address'].setValue('Bệnh viện K Tân Triều, phường Thanh Liệt');
    page.confirmAddressPicker();
    expect(page.addressPickerOpen()).toBe(false);
    expect(page.form.controls['regionId'].value).toBe('ha-noi');
    expect(page.form.controls['address'].value).toContain('Bệnh viện K');
  });
});
