import { TestBed } from '@angular/core/testing';

import { CharityProgramStorageService } from './charity-program-storage.service';

describe('CharityProgramStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('creates a pending proposal for the correct benefactor', () => {
    const service = TestBed.inject(CharityProgramStorageService);
    const proposal = service.create('PARTNER-A', 'Minh Anh', {
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

    expect(proposal.status).toBe('PENDING');
    expect(service.proposalsFor('PARTNER-A')).toHaveLength(1);
    expect(service.proposalsFor('PARTNER-B')).toHaveLength(0);
    expect(service.review(proposal.id, 'PUBLISHED')?.status).toBe('PUBLISHED');
    expect(service.review(proposal.id, 'REJECTED', 'Không được duyệt lần hai')).toBeNull();
    localStorage.setItem(
      'tram-k.charity-program-proposals',
      JSON.stringify([
        { ...proposal, status: 'APPROVED' },
        { ...proposal, id: 'legacy-pending', status: 'PENDING_REVIEW' },
      ]),
    );
    TestBed.resetTestingModule();
    const restored = TestBed.inject(CharityProgramStorageService);
    expect(restored.proposals().map((item) => item.status)).toEqual(['PUBLISHED', 'PENDING']);
  });

  it('enforces ownership and the review lifecycle when resubmitting or cancelling', () => {
    const service = TestBed.inject(CharityProgramStorageService);
    const proposal = service.create('PARTNER-A', 'Minh Anh', {
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

    expect(service.cancelPending('PARTNER-B', proposal.id)).toBe(false);
    expect(
      service.resubmitRejected('PARTNER-A', proposal.id, {
        title: proposal.title,
        supportType: proposal.supportType,
        description: proposal.description,
        regionId: proposal.regionId,
        city: proposal.city,
        address: proposal.address,
        schedule: proposal.schedule,
        capacity: proposal.capacity,
        contactName: proposal.contactName,
        phone: proposal.phone,
        email: proposal.email,
      }),
    ).toBeNull();
    expect(service.cancelPending('PARTNER-A', proposal.id)).toBe(true);
  });

  it('requires a meaningful rejection reason and syncs the review result', () => {
    const service = TestBed.inject(CharityProgramStorageService);
    const proposal = service.create('PARTNER-A', 'Minh Anh', {
      title: 'Chuyến xe yêu thương',
      supportType: 'TRANSPORT',
      description: 'Hỗ trợ đưa đón bệnh nhân có hoàn cảnh khó khăn đến bệnh viện.',
      regionId: 'ha-noi',
      city: 'Hà Nội',
      address: 'Bệnh viện K Tân Triều',
      schedule: 'Thứ Hai đến thứ Sáu',
      capacity: 20,
      contactName: 'Minh Anh',
      phone: '0912345678',
      email: 'minhanh@example.com',
    });

    expect(service.review(proposal.id, 'REJECTED', 'Ngắn')).toBeNull();
    const rejected = service.review(
      proposal.id,
      'REJECTED',
      'Cần bổ sung lịch xe và đầu mối phụ trách tại bệnh viện.',
    );
    expect(rejected?.status).toBe('REJECTED');
    expect(service.proposalsFor('PARTNER-A')[0].reviewReason).toContain('Cần bổ sung');
    expect(service.review(proposal.id, 'PUBLISHED')).toBeNull();
  });
});
