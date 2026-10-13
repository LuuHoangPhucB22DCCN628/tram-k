import { TestBed } from '@angular/core/testing';
import { PartnerApplicationStorageService } from './partner-application-storage.service';

const input = {
  organizationName: 'Nhóm thiện nguyện An Tâm',
  representativeName: 'Nguyễn An',
  phone: '0912345678',
  email: 'an@example.com',
  address: 'Số 10 Trần Phú, Hà Nội',
  introduction: 'Chúng tôi hỗ trợ suất ăn và phương tiện cho bệnh nhân khó khăn.',
  documentNames: ['xac-minh.pdf'],
};

describe('PartnerApplicationStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });
  afterEach(() => localStorage.clear());

  it('prevents duplicate pending applications', () => {
    const service = TestBed.inject(PartnerApplicationStorageService);
    expect(service.submit('USER-1', 'Nguyễn An', input)?.status).toBe('PENDING');
    expect(service.submit('USER-1', 'Nguyễn An', input)).toBeNull();
  });

  it('requires a rejection reason and permits a rejected application to be resubmitted', () => {
    const service = TestBed.inject(PartnerApplicationStorageService);
    const application = service.submit('USER-1', 'Nguyễn An', input)!;
    expect(service.review(application.id, 'REJECTED', 'Admin', 'ngắn')).toBeNull();
    expect(
      service.review(application.id, 'REJECTED', 'Admin', 'Cần bổ sung giấy xác nhận tổ chức.')
        ?.status,
    ).toBe('REJECTED');
    expect(service.submit('USER-1', 'Nguyễn An', input)?.status).toBe('PENDING');
  });

  it('records immutable review metadata on approval', () => {
    const service = TestBed.inject(PartnerApplicationStorageService);
    const application = service.submit('USER-1', 'Nguyễn An', input)!;
    const approved = service.review(application.id, 'APPROVED', 'Admin Trạm K');
    expect(approved).toMatchObject({ status: 'APPROVED', reviewedBy: 'Admin Trạm K' });
    expect(approved?.reviewedAt).toBeTruthy();
    expect(
      service.review(application.id, 'REJECTED', 'Admin', 'Không thể đổi quyết định'),
    ).toBeNull();
  });
});
