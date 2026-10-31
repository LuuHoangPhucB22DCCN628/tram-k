import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { ManagedResourceSyncService } from '@core/data/managed-resource-sync.service';
import { CharityProgramClockService } from '../../services/charity-program-clock.service';
import { of } from 'rxjs';

import { CharityProgramRegistrationService } from '../../services/charity-program-registration.service';
import { CharityProgramStorageService } from '../../services/charity-program-storage.service';
import { PartnerProgramManagementPage } from './partner-program-management-page';

describe('PartnerProgramManagementPage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('shows a completed schedule while keeping its registration history available', async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerProgramManagementPage],
      providers: [provideRouter([])],
    }).compileComponents();
    vi.spyOn(TestBed.inject(ManagedResourceSyncService), 'upsertResult').mockReturnValue(of(true));
    vi.spyOn(TestBed.inject(AuthService), 'currentUser').mockReturnValue({
      id: 'PARTNER-A', displayName: 'Bếp yêu thương', email: 'bep@example.com', role: 'PARTNER',
    });
    const storage = TestBed.inject(CharityProgramStorageService);
    const program = storage.create('PARTNER-A', 'Bếp yêu thương', {
      title: 'Bữa cơm đã kết thúc', supportType: 'MEAL',
      description: 'Trao suất cơm miễn phí cho bệnh nhân.', regionId: 'ha-noi', city: 'Hà Nội',
      address: 'Bệnh viện K Tân Triều', schedule: '09:00–11:00, ngày 24/10/2099',
      scheduleType: 'ONE_TIME', startsOn: '2099-10-24', startTime: '09:00', endTime: '11:00',
      capacity: 20, contactName: 'Minh Anh', phone: '0912345678', email: 'minhanh@example.com',
    });
    await storage.review(program.id, 'PUBLISHED');
    TestBed.inject(CharityProgramClockService).now.set(new Date('2099-10-24T04:00:00Z'));

    const fixture = TestBed.createComponent(PartnerProgramManagementPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.program-card__meta [data-status="COMPLETED"]')?.textContent)
      .toContain('Đã hoàn thành');
    element.querySelector<HTMLButtonElement>('.program-card__actions button')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.program-registrations')).not.toBeNull();
    expect(element.textContent).toContain('hồ sơ đăng ký vẫn được lưu');
  });

  it('allows the owner to confirm and complete a patient registration', async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerProgramManagementPage],
      providers: [provideRouter([{ path: '', component: PartnerProgramManagementPage }])],
    }).compileComponents();
    vi.spyOn(TestBed.inject(ManagedResourceSyncService), 'upsertResult').mockReturnValue(of(true));
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'currentUser').mockReturnValue({
      id: 'PARTNER-A',
      displayName: 'Bếp yêu thương',
      email: 'bep@example.com',
      role: 'PARTNER',
    });
    const programs = TestBed.inject(CharityProgramStorageService);
    const program = programs.create('PARTNER-A', 'Bếp yêu thương', {
      title: 'Bữa cơm tiếp sức',
      supportType: 'MEAL',
      description: 'Trao suất cơm miễn phí cho bệnh nhân có hoàn cảnh khó khăn.',
      regionId: 'ha-noi',
      city: 'Hà Nội',
      address: 'Bệnh viện K Tân Triều',
      schedule: 'Trưa thứ Bảy hằng tuần',
      capacity: 20,
      contactName: 'Minh Anh',
      phone: '0912345678',
      email: 'minhanh@example.com',
    });
    await programs.review(program.id, 'PUBLISHED');
    const registrations = TestBed.inject(CharityProgramRegistrationService);
    registrations.register(program.id, 'PATIENT-A', 20, {
      displayName: 'Nguyễn An',
      email: 'an@example.com',
    });
    await TestBed.inject(Router).navigateByUrl(
      `/?program=${encodeURIComponent(program.id)}&registration=PATIENT-A`,
    );

    const fixture = TestBed.createComponent(PartnerProgramManagementPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Nguyễn An');
    expect(element.textContent).toContain('19 chỗ');
    expect(element.querySelector('.applicant-card--highlighted')).not.toBeNull();

    element.querySelector<HTMLButtonElement>('.applicant-card__primary')?.click();
    fixture.detectChanges();
    expect(registrations.registrationsFor('PATIENT-A')[0].status).toBe('CONFIRMED');

    element.querySelector<HTMLButtonElement>('.applicant-card__primary')?.click();
    fixture.detectChanges();
    expect(registrations.registrationsFor('PATIENT-A')[0].status).toBe('COMPLETED');
  });

  it('does not expose registrations belonging to another partner program', async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerProgramManagementPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'currentUser').mockReturnValue({
      id: 'PARTNER-A',
      displayName: 'Bếp yêu thương',
      email: 'bep@example.com',
      role: 'PARTNER',
    });
    const programs = TestBed.inject(CharityProgramStorageService);
    const other = programs.create('PARTNER-B', 'Nhóm khác', {
      title: 'Chương trình riêng',
      supportType: 'OTHER',
      description: 'Chương trình thuộc quyền quản lý của đối tác khác.',
      regionId: 'da-nang',
      city: 'Đà Nẵng',
      address: 'Trung tâm thành phố',
      schedule: 'Chủ Nhật',
      capacity: 10,
      contactName: 'Trần Bình',
      phone: '0987654321',
      email: 'binh@example.com',
    });
    programs.review(other.id, 'PUBLISHED');
    TestBed.inject(CharityProgramRegistrationService).register(other.id, 'PATIENT-B', 10, {
      displayName: 'Người đăng ký khác',
      email: 'other@example.com',
    });

    const fixture = TestBed.createComponent(PartnerProgramManagementPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.program-card')).toHaveLength(0);
    expect(element.textContent).not.toContain('Người đăng ký khác');
  });
});
