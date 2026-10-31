import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ManagedResourceSyncService } from '@core/data/managed-resource-sync.service';
import { ManagedResourceAdminApiService } from '@core/data/managed-resource-admin-api.service';

import { CharityProgramStorageService } from './charity-program-storage.service';

describe('CharityProgramStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('creates a pending proposal for the correct benefactor', async () => {
    vi.spyOn(TestBed.inject(ManagedResourceSyncService), 'upsertResult').mockReturnValue(of(true));
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
    expect((await service.review(proposal.id, 'PUBLISHED'))?.status).toBe('PUBLISHED');
    expect(await service.review(proposal.id, 'REJECTED', 'Không được duyệt lần hai')).toBeNull();
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

  it('requires a meaningful rejection reason and syncs the review result', async () => {
    vi.spyOn(TestBed.inject(ManagedResourceSyncService), 'upsertResult').mockReturnValue(of(true));
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

    expect(await service.review(proposal.id, 'REJECTED', 'Ngắn')).toBeNull();
    const rejected = await service.review(
      proposal.id,
      'REJECTED',
      'Cần bổ sung lịch xe và đầu mối phụ trách tại bệnh viện.',
    );
    expect(rejected?.status).toBe('REJECTED');
    expect(service.proposalsFor('PARTNER-A')[0].reviewReason).toContain('Cần bổ sung');
    expect(await service.review(proposal.id, 'PUBLISHED')).toBeNull();
  });

  it('keeps a program pending when the server cannot save the review', async () => {
    const sync = vi.spyOn(TestBed.inject(ManagedResourceSyncService), 'upsertResult').mockReturnValue(of(true));
    const service = TestBed.inject(CharityProgramStorageService);
    const proposal = service.create('PARTNER-A', 'Minh Anh', {
      title: 'Bữa cơm yêu thương', supportType: 'MEAL', description: 'Suất ăn miễn phí.',
      regionId: 'ha-noi', city: 'Hà Nội', address: 'Bệnh viện K Tân Triều',
      schedule: 'Sáng thứ Bảy', capacity: 20, contactName: 'Minh Anh',
      phone: '0912345678', email: 'minhanh@example.com',
    });
    sync.mockReturnValueOnce(of(false));
    expect(await service.review(proposal.id, 'PUBLISHED')).toBeNull();
    expect(service.proposalFor('PARTNER-A', proposal.id)?.status).toBe('PENDING');
  });

  it('only updates published details after the server confirms the save', async () => {
    const sync = TestBed.inject(ManagedResourceSyncService);
    const upsert = vi.spyOn(sync, 'upsertResult').mockReturnValue(of(true));
    const service = TestBed.inject(CharityProgramStorageService);
    const proposal = service.create('PARTNER-A', 'Minh Anh', {
      title: 'Bữa cơm yêu thương', supportType: 'MEAL', description: 'Phát suất cơm miễn phí.',
      regionId: 'cao-bang', city: 'Cao Bằng', address: 'dddddddddddddd',
      schedule: 'Thứ Hai', capacity: 20, contactName: 'Minh Anh',
      phone: '0912345678', email: 'minhanh@example.com',
    });
    await service.review(proposal.id, 'PUBLISHED');
    const changes = {
      address: 'Bệnh viện Đa khoa tỉnh Cao Bằng', schedule: '09:00–11:00, ngày 24/10/2099',
      structuredSchedule: { scheduleType: 'ONE_TIME' as const, startsOn: '2099-10-24',
        startTime: '09:00', endTime: '11:00' },
      financialNeedRequired: false, eligibilityNote: '',
    };

    expect(await service.updatePublishedDetails(proposal.id, { ...changes, address: 'dddddddddddddd' })).toBeNull();
    upsert.mockReturnValueOnce(of(false));
    expect(await service.updatePublishedDetails(proposal.id, changes)).toBeNull();
    expect(service.proposalFor('PARTNER-A', proposal.id)?.address).toBe('dddddddddddddd');

    const saved = await service.updatePublishedDetails(proposal.id, changes);
    expect(saved?.address).toBe(changes.address);
    expect(service.proposalFor('PARTNER-A', proposal.id)?.schedule).toBe(changes.schedule);
    expect(service.proposalFor('PARTNER-A', proposal.id)?.scheduleType).toBe('ONE_TIME');
  });

  it('removes a program locally only after the server deletes it', async () => {
    const sync = TestBed.inject(ManagedResourceSyncService);
    const remove = vi.spyOn(sync, 'removeResult').mockReturnValue(of(null));
    const service = TestBed.inject(CharityProgramStorageService);
    const proposal = service.create('PARTNER-A', 'Minh Anh', {
      title: 'Bữa cơm yêu thương', supportType: 'MEAL', description: 'Suất cơm miễn phí.',
      regionId: 'cao-bang', city: 'Cao Bằng', address: 'Bệnh viện Đa khoa tỉnh Cao Bằng',
      schedule: 'Thứ Hai', capacity: 20, contactName: 'Minh Anh',
      phone: '0912345678', email: 'minhanh@example.com',
    });
    expect(await service.deleteByAdmin(proposal.id)).toBeNull();
    expect(service.all()).toHaveLength(1);
    remove.mockReturnValueOnce(of(1));
    expect(await service.deleteByAdmin(proposal.id)).toBe(1);
    expect(service.all()).toHaveLength(0);
  });

  it('does not recreate a deleted published program from old browser storage', () => {
    localStorage.setItem('tram-k.charity-program-proposals', JSON.stringify([{
      id: 'PROGRAM-DELETED', ownerId: 'PARTNER-A', ownerName: 'Minh Anh',
      title: 'Bữa cơm Cao Bằng', supportType: 'MEAL', description: 'Suất cơm miễn phí.',
      regionId: 'cao-bang', city: 'Cao Bằng', address: 'Bệnh viện Đa khoa tỉnh Cao Bằng',
      schedule: 'Thứ Hai', capacity: 20, contactName: 'Minh Anh',
      phone: '0912345678', email: 'minhanh@example.com', status: 'PUBLISHED',
      createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
    }]));
    vi.spyOn(TestBed.inject(ManagedResourceAdminApiService), 'state')
      .mockReturnValue(of({ initialized: true, items: [] }));
    const sync = vi.spyOn(TestBed.inject(ManagedResourceSyncService), 'upsertResult');
    const service = TestBed.inject(CharityProgramStorageService);
    service.initializeAdmin();
    expect(service.all()).toHaveLength(0);
    expect(sync).not.toHaveBeenCalled();
  });
});
