import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ManagedResourceSyncService } from '@core/data/managed-resource-sync.service';
import { CharityProgramClockService } from '@features/account/services/charity-program-clock.service';
import { CharityProgramStorageService } from '@features/account/services/charity-program-storage.service';

import { AdminCharityProgramsPage } from './admin-charity-programs-page';

describe('AdminCharityProgramsPage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('allows an admin to reschedule a completed program without changing its review status', async () => {
    await TestBed.configureTestingModule({ imports: [AdminCharityProgramsPage] }).compileComponents();
    vi.spyOn(TestBed.inject(ManagedResourceSyncService), 'upsertResult').mockReturnValue(of(true));
    const storage = TestBed.inject(CharityProgramStorageService);
    const program = storage.create('PARTNER-A', 'Minh Anh', {
      title: 'Suất cơm đã kết thúc', supportType: 'MEAL',
      description: 'Suất ăn miễn phí cho bệnh nhân.', regionId: 'ha-noi', city: 'Hà Nội',
      address: 'Bệnh viện K Tân Triều', schedule: '09:00–11:00, ngày 24/10/2099',
      scheduleType: 'ONE_TIME', startsOn: '2099-10-24', startTime: '09:00', endTime: '11:00',
      capacity: 20, contactName: 'Minh Anh', phone: '0912345678', email: 'minhanh@example.com',
    });
    await storage.review(program.id, 'PUBLISHED');
    const clock = TestBed.inject(CharityProgramClockService);
    clock.now.set(new Date('2099-10-24T04:00:00Z'));

    const fixture = TestBed.createComponent(AdminCharityProgramsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.admin-program-card__meta [data-status="COMPLETED"]')?.textContent)
      .toContain('Đã hoàn thành');

    const filter = element.querySelector<HTMLSelectElement>('header select')!;
    filter.value = 'COMPLETED';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(element.querySelectorAll('.admin-program-card')).toHaveLength(1);
    element.querySelector<HTMLButtonElement>('.admin-program-card__actions button')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.admin-dialog__eligibility')).not.toBeNull();
    expect(element.textContent).toContain('đã kết thúc');
    const save = element.querySelector<HTMLButtonElement>('.admin-dialog__actions .admin-program-card__approve')!;
    expect(save.disabled).toBe(true);
    const scheduleType = element.querySelector<HTMLSelectElement>('.admin-dialog__eligibility select')!;
    scheduleType.value = 'WEEKLY';
    scheduleType.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const dates = element.querySelectorAll<HTMLInputElement>('.admin-dialog__eligibility input[type="date"]');
    dates[0].value = '2099-10-26'; dates[0].dispatchEvent(new Event('input'));
    dates[1].value = '2099-11-30'; dates[1].dispatchEvent(new Event('input'));
    const times = element.querySelectorAll<HTMLInputElement>('.admin-dialog__eligibility input[type="time"]');
    times[0].value = '09:00'; times[0].dispatchEvent(new Event('input'));
    times[1].value = '11:00'; times[1].dispatchEvent(new Event('input'));
    element.querySelector<HTMLInputElement>('.admin-dialog__weekdays input[type="checkbox"]')?.click();
    fixture.detectChanges();
    expect(save.disabled).toBe(false);
    save.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(storage.proposalFor('PARTNER-A', program.id)?.scheduleType).toBe('WEEKLY');
    expect(storage.proposalFor('PARTNER-A', program.id)?.weekdays).toContain(1);
    expect(storage.proposalFor('PARTNER-A', program.id)?.status).toBe('PUBLISHED');
  });

  it('approves a pending proposal and persists the decision', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCharityProgramsPage],
    }).compileComponents();
    vi.spyOn(TestBed.inject(ManagedResourceSyncService), 'upsertResult').mockReturnValue(of(true));
    const storage = TestBed.inject(CharityProgramStorageService);
    const proposal = storage.create('PARTNER-A', 'Minh Anh', {
      title: 'Bữa cơm yêu thương',
      supportType: 'MEAL',
      description: 'Phát suất ăn miễn phí cho bệnh nhân có hoàn cảnh khó khăn.',
      regionId: 'ha-noi',
      city: 'Hà Nội',
      address: 'Bệnh viện K Tân Triều',
      schedule: 'Sáng thứ Bảy hằng tuần',
      scheduleType: 'WEEKLY',
      startsOn: '2099-01-01',
      endsOn: '2099-12-31',
      startTime: '08:00',
      endTime: '10:00',
      weekdays: [6],
      capacity: 100,
      contactName: 'Minh Anh',
      phone: '0912345678',
      email: 'minhanh@example.com',
    });

    const fixture = TestBed.createComponent(AdminCharityProgramsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.admin-program-card__approve')?.click();
    fixture.detectChanges();
    const audience = element.querySelector<HTMLSelectElement>('.admin-dialog__eligibility select');
    expect(audience).not.toBeNull();
    audience!.value = 'PATIENT_AND_CAREGIVER';
    audience!.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.admin-dialog__actions .admin-program-card__approve')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(storage.proposalFor('PARTNER-A', proposal.id)?.status).toBe('PUBLISHED');
    expect(storage.proposalFor('PARTNER-A', proposal.id)?.eligibleAudience).toBe('PATIENT_AND_CAREGIVER');
    expect(element.textContent).toContain('Đã xuất bản chương trình');
  });

  it('lets an admin correct a published placeholder address and schedule', async () => {
    await TestBed.configureTestingModule({ imports: [AdminCharityProgramsPage] }).compileComponents();
    vi.spyOn(TestBed.inject(ManagedResourceSyncService), 'upsertResult').mockReturnValue(of(true));
    const storage = TestBed.inject(CharityProgramStorageService);
    const proposal = storage.create('PARTNER-A', 'Minh Anh', {
      title: 'Bữa cơm yêu thương', supportType: 'MEAL', description: 'Phát suất cơm miễn phí.',
      regionId: 'cao-bang', city: 'Cao Bằng', address: 'dddddddddddddd',
      schedule: 'Thứ Hai', capacity: 20, contactName: 'Minh Anh',
      phone: '0912345678', email: 'minhanh@example.com',
    });
    await storage.review(proposal.id, 'PUBLISHED');
    const fixture = TestBed.createComponent(AdminCharityProgramsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.admin-program-card__actions button')?.click();
    fixture.detectChanges();
    const address = element.querySelector<HTMLInputElement>('.admin-dialog__eligibility input[type="text"]')!;
    expect(element.textContent).toContain('Cần cập nhật lịch');
    expect(element.querySelector<HTMLButtonElement>('.admin-dialog__actions .admin-program-card__approve')?.disabled).toBe(true);
    address.value = 'Bệnh viện Đa khoa tỉnh Cao Bằng';
    address.dispatchEvent(new Event('input'));
    const dates = element.querySelectorAll<HTMLInputElement>('.admin-dialog__eligibility input[type="date"]');
    dates[0].value = '2099-10-24'; dates[0].dispatchEvent(new Event('input'));
    dates[1].value = '2099-11-30'; dates[1].dispatchEvent(new Event('input'));
    const times = element.querySelectorAll<HTMLInputElement>('.admin-dialog__eligibility input[type="time"]');
    times[0].value = '09:00'; times[0].dispatchEvent(new Event('input'));
    times[1].value = '11:00'; times[1].dispatchEvent(new Event('input'));
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.admin-dialog__actions .admin-program-card__approve')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(storage.proposalFor('PARTNER-A', proposal.id)?.address).toBe('Bệnh viện Đa khoa tỉnh Cao Bằng');
    expect(storage.proposalFor('PARTNER-A', proposal.id)?.scheduleType).toBe('WEEKLY');
    expect(storage.proposalFor('PARTNER-A', proposal.id)?.weekdays).toEqual([1]);
    expect(element.textContent).toContain('Đã lưu thay đổi lên máy chủ');
  });

  it('suggests Monday and Tuesday from a legacy weekly text without guessing dates or hours', async () => {
    await TestBed.configureTestingModule({ imports: [AdminCharityProgramsPage] }).compileComponents();
    vi.spyOn(TestBed.inject(ManagedResourceSyncService), 'upsertResult').mockReturnValue(of(true));
    const storage = TestBed.inject(CharityProgramStorageService);
    const proposal = storage.create('PARTNER-A', 'Minh Anh', {
      title: 'Suất cơm Ninh Bình', supportType: 'MEAL', description: 'Suất cơm miễn phí.',
      regionId: 'ninh-binh', city: 'Ninh Bình', address: 'Bệnh viện Đa khoa tỉnh Ninh Bình',
      schedule: 'Thứ Hai, Thứ Ba (hàng tuần)', capacity: 20, contactName: 'Minh Anh',
      phone: '0912345678', email: 'minhanh@example.com',
    });
    await storage.review(proposal.id, 'PUBLISHED');
    const fixture = TestBed.createComponent(AdminCharityProgramsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.admin-program-card__actions button')?.click();
    fixture.detectChanges();
    expect(element.querySelector<HTMLSelectElement>('.admin-dialog__eligibility select')?.value).toBe('WEEKLY');
    const days = element.querySelectorAll<HTMLInputElement>('.admin-dialog__weekdays input');
    expect([...days].filter((day) => day.checked)).toHaveLength(2);
    expect(element.querySelector<HTMLInputElement>('.admin-dialog__eligibility input[type="date"]')?.value).toBe('');
    expect(element.querySelector<HTMLButtonElement>('.admin-dialog__actions .admin-program-card__approve')?.disabled).toBe(true);
  });

  it('requires confirmation before deleting a program and its registrations', async () => {
    await TestBed.configureTestingModule({ imports: [AdminCharityProgramsPage] }).compileComponents();
    const storage = TestBed.inject(CharityProgramStorageService);
    const proposal = storage.create('PARTNER-A', 'Minh Anh', {
      title: 'Bữa cơm Cao Bằng', supportType: 'MEAL', description: 'Suất cơm miễn phí.',
      regionId: 'cao-bang', city: 'Cao Bằng', address: 'Bệnh viện Đa khoa tỉnh Cao Bằng',
      schedule: 'Thứ Hai', capacity: 20, contactName: 'Minh Anh',
      phone: '0912345678', email: 'minhanh@example.com',
    });
    const remove = vi.spyOn(storage, 'deleteByAdmin').mockResolvedValue(1);
    const fixture = TestBed.createComponent(AdminCharityProgramsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const deleteButton = [...element.querySelectorAll<HTMLButtonElement>('.admin-program-card__actions button')]
      .find((button) => button.textContent?.trim() === 'Xóa chương trình');
    deleteButton?.click();
    fixture.detectChanges();
    expect(remove).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Mọi hồ sơ đăng ký liên quan cũng bị xóa');
    element.querySelector<HTMLButtonElement>('[role="alertdialog"] .admin-program-card__reject')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(remove).toHaveBeenCalledWith(proposal.id);
    expect(element.textContent).toContain('1 hồ sơ đăng ký liên quan');
  });
});
