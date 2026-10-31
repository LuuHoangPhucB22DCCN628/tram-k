import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';
import { ManagedResourceSyncService } from '@core/data/managed-resource-sync.service';
import { CharityProgramRegistrationService } from '@features/account/services/charity-program-registration.service';
import { CharityProgramClockService } from '@features/account/services/charity-program-clock.service';
import { CharityProgramStorageService } from '@features/account/services/charity-program-storage.service';

import { CommunitySupportProgramsPage } from './community-support-programs-page';

describe('CommunitySupportProgramsPage', () => {
  afterEach(() => localStorage.clear());

  it('shows only published programs and filters them by location', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunitySupportProgramsPage],
      providers: [provideRouter([])],
    }).compileComponents();
    vi.spyOn(TestBed.inject(ManagedResourceSyncService), 'upsertResult').mockReturnValue(of(true));
    const storage = TestBed.inject(CharityProgramStorageService);
    const published = storage.create('PARTNER-A', 'Bếp yêu thương', {
      title: 'Bữa cơm tiếp sức tại Hà Nội',
      supportType: 'MEAL',
      description: 'Trao suất cơm miễn phí cho bệnh nhân và người nhà đang điều trị.',
      regionId: 'ha-noi',
      city: 'Hà Nội',
      address: 'Bệnh viện K Tân Triều',
      schedule: 'Trưa thứ Bảy hằng tuần',
      scheduleType: 'ONE_TIME', startsOn: '2099-10-24', startTime: '09:00', endTime: '11:00',
      capacity: 80,
      contactName: 'Minh Anh',
      phone: '0912345678',
      email: 'minhanh@example.com',
    });
    await storage.review(published.id, 'PUBLISHED');
    storage.create('PARTNER-B', 'Nhóm sẻ chia', {
      title: 'Chuyến xe đang chờ duyệt',
      supportType: 'TRANSPORT',
      description: 'Đưa đón bệnh nhân khó khăn trong các ngày điều trị.',
      regionId: 'da-nang',
      city: 'Đà Nẵng',
      address: 'Trung tâm thành phố',
      schedule: 'Thứ Hai đến thứ Sáu',
      capacity: 20,
      contactName: 'Lan Anh',
      phone: '0987654321',
      email: 'lananh@example.com',
    });

    const fixture = TestBed.createComponent(CommunitySupportProgramsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.support-program-card')).toHaveLength(1);
    expect(element.textContent).toContain('Bữa cơm tiếp sức tại Hà Nội');
    expect(element.textContent).not.toContain('Chuyến xe đang chờ duyệt');

    const select = element.querySelector<HTMLSelectElement>('.support-programs__filter select')!;
    select.value = 'ha-noi';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(element.querySelectorAll('.support-program-card')).toHaveLength(1);
  });

  it('registers a patient once and disables the repeated action', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunitySupportProgramsPage],
      providers: [provideRouter([])],
    }).compileComponents();
    vi.spyOn(TestBed.inject(ManagedResourceSyncService), 'upsertResult').mockReturnValue(of(true));
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'currentUser').mockReturnValue({
      id: 'PATIENT-A',
      displayName: 'Nguyễn An',
      email: 'an@example.com',
      role: 'PATIENT',
    });
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'hasRole').mockReturnValue(true);
    const storage = TestBed.inject(CharityProgramStorageService);
    const program = storage.create('PARTNER-A', 'Bếp yêu thương', {
      title: 'Bữa cơm tiếp sức',
      supportType: 'MEAL',
      description: 'Trao suất cơm miễn phí cho bệnh nhân và người nhà đang điều trị.',
      regionId: 'ha-noi',
      city: 'Hà Nội',
      address: 'Bệnh viện K Tân Triều',
      schedule: 'Trưa thứ Bảy hằng tuần',
      scheduleType: 'ONE_TIME', startsOn: '2099-10-24', startTime: '09:00', endTime: '11:00',
      capacity: 80,
      contactName: 'Minh Anh',
      phone: '0912345678',
      email: 'minhanh@example.com',
    });
    await storage.review(program.id, 'PUBLISHED');
    const registrations = TestBed.inject(CharityProgramRegistrationService);
    vi.spyOn(registrations, 'registerRemote').mockImplementation((programId, userId, capacity, user) =>
      of(registrations.register(programId, userId, capacity, user)),
    );

    const fixture = TestBed.createComponent(CommunitySupportProgramsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.support-program-card button')?.click();
    fixture.detectChanges();
    element
      .querySelector<HTMLButtonElement>(
        '.support-program-dialog__actions .support-program-dialog__button--primary',
      )
      ?.click();
    fixture.detectChanges();

    expect(
      TestBed.inject(CharityProgramRegistrationService).isRegistered(program.id, 'PATIENT-A'),
    ).toBe(true);
    const action = element.querySelector<HTMLButtonElement>(
      '.support-program-dialog__actions .support-program-dialog__button--primary',
    );
    expect(action?.disabled).toBe(true);
    expect(action?.textContent).toContain('Đã đăng ký');
  });

  it('hides a one-time published program after its scheduled date', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunitySupportProgramsPage], providers: [provideRouter([])],
    }).compileComponents();
    vi.spyOn(TestBed.inject(ManagedResourceSyncService), 'upsertResult').mockReturnValue(of(true));
    const storage = TestBed.inject(CharityProgramStorageService);
    const old = storage.create('PARTNER-A', 'Bếp yêu thương', {
      title: 'Suất cơm đã kết thúc', supportType: 'MEAL',
      description: 'Trao suất cơm miễn phí cho bệnh nhân.', regionId: 'ha-noi', city: 'Hà Nội',
      address: 'Bệnh viện K Tân Triều', schedule: '09:00–11:00, ngày 01/01/2020',
      scheduleType: 'ONE_TIME', startsOn: '2020-01-01', startTime: '09:00', endTime: '11:00',
      capacity: 10, contactName: 'Minh Anh', phone: '0912345678', email: 'minhanh@example.com',
    });
    await storage.review(old.id, 'PUBLISHED');

    const fixture = TestBed.createComponent(CommunitySupportProgramsPage);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Suất cơm đã kết thúc');
  });

  it('removes a one-time program from the open page when its end time passes', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunitySupportProgramsPage], providers: [provideRouter([])],
    }).compileComponents();
    vi.spyOn(TestBed.inject(ManagedResourceSyncService), 'upsertResult').mockReturnValue(of(true));
    const clock = TestBed.inject(CharityProgramClockService);
    clock.now.set(new Date('2099-10-24T03:59:00Z'));
    const storage = TestBed.inject(CharityProgramStorageService);
    const program = storage.create('PARTNER-A', 'Bếp yêu thương', {
      title: 'Suất cơm sắp kết thúc', supportType: 'MEAL',
      description: 'Hỗ trợ suất cơm tại bệnh viện.', regionId: 'ha-noi', city: 'Hà Nội',
      address: 'Bệnh viện K Tân Triều', schedule: '09:00–11:00, ngày 24/10/2099',
      scheduleType: 'ONE_TIME', startsOn: '2099-10-24', startTime: '09:00', endTime: '11:00',
      capacity: 10, contactName: 'Minh Anh', phone: '0912345678', email: 'minhanh@example.com',
    });
    await storage.review(program.id, 'PUBLISHED');

    const fixture = TestBed.createComponent(CommunitySupportProgramsPage);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Suất cơm sắp kết thúc');

    clock.now.set(new Date('2099-10-24T04:00:00Z'));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Suất cơm sắp kết thúc');
    expect(storage.proposalFor('PARTNER-A', program.id)?.status).toBe('PUBLISHED');
  });
});
