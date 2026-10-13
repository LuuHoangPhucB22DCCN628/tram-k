import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CharityProgramStorageService } from '@features/account/services/charity-program-storage.service';
import { MemberPostStorageService } from '@features/account/services/member-post-storage.service';

import { AdminDashboardPage } from './admin-dashboard-page';

describe('AdminDashboardPage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('aggregates current review work from the shared feature stores', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardPage],
      providers: [provideRouter([])],
    }).compileComponents();
    TestBed.inject(MemberPostStorageService).create(
      'MEMBER-1',
      {
        title: 'Câu chuyện cần duyệt',
        content: 'Nội dung bài viết cần kiểm duyệt.',
        status: 'PENDING',
      },
      'Nguyễn An',
    );
    TestBed.inject(CharityProgramStorageService).create('PARTNER-1', 'Nhà hảo tâm', {
      title: 'Bữa cơm yêu thương',
      supportType: 'MEAL',
      description: 'Chương trình cung cấp suất cơm cho bệnh nhân.',
      regionId: 'ha-noi',
      city: 'Hà Nội',
      address: 'Bệnh viện K Tân Triều',
      schedule: 'Chủ Nhật',
      capacity: 100,
      contactName: 'Nguyễn Minh',
      phone: '0900000000',
      email: 'minh@example.com',
    });

    const fixture = TestBed.createComponent(AdminDashboardPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const queueText = element.querySelector('.review-list')?.textContent ?? '';

    expect(element.querySelectorAll('.metric-card')).toHaveLength(4);
    expect(queueText).toContain('Bài viết chờ duyệt');
    expect(queueText).toContain('Đề xuất chương trình');
    expect(element.querySelectorAll('.activity-list a')).toHaveLength(2);
  });
});
