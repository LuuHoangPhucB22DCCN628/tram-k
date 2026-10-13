import { TestBed } from '@angular/core/testing';

import { CharityProgramStorageService } from '@features/account/services/charity-program-storage.service';

import { AdminCharityProgramsPage } from './admin-charity-programs-page';

describe('AdminCharityProgramsPage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('approves a pending proposal and persists the decision', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCharityProgramsPage],
    }).compileComponents();
    const storage = TestBed.inject(CharityProgramStorageService);
    const proposal = storage.create('PARTNER-A', 'Minh Anh', {
      title: 'Bữa cơm yêu thương',
      supportType: 'MEAL',
      description: 'Phát suất ăn miễn phí cho bệnh nhân có hoàn cảnh khó khăn.',
      regionId: 'ha-noi',
      city: 'Hà Nội',
      address: 'Bệnh viện K Tân Triều',
      schedule: 'Sáng thứ Bảy hằng tuần',
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

    expect(storage.proposalFor('PARTNER-A', proposal.id)?.status).toBe('PUBLISHED');
    expect(element.textContent).toContain('Đã xuất bản chương trình');
  });
});
