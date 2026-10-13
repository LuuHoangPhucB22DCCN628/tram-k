import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { CharityProgramRegistrationService } from '@features/account/services/charity-program-registration.service';
import { CharityProgramStorageService } from '@features/account/services/charity-program-storage.service';
import { CommunityMealRegistrationService } from '@features/community/services/community-meal-registration.service';

import { MemberRegistrationsPage } from './member-registrations-page';

describe('MemberRegistrationsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows and cancels a registration owned by the current member', async () => {
    await TestBed.configureTestingModule({
      imports: [MemberRegistrationsPage],
      providers: [provideRouter([{ path: '', component: MemberRegistrationsPage }])],
    }).compileComponents();
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'currentUser').mockReturnValue({
      id: 'MEMBER-A',
      displayName: 'Nguyễn An Nhiên',
      email: 'annhien@example.com',
      role: 'PATIENT',
    });
    TestBed.inject(CommunityMealRegistrationService).register('tan-trieu', 'MEMBER-A');

    const fixture = TestBed.createComponent(MemberRegistrationsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Viện K Tân Triều');
    element.querySelector<HTMLButtonElement>('.registration-card__actions button')?.click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Bạn chưa đăng ký chương trình nào');
  });

  it('shows and cancels a published benefactor support program', async () => {
    await TestBed.configureTestingModule({
      imports: [MemberRegistrationsPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'currentUser').mockReturnValue({
      id: 'MEMBER-A',
      displayName: 'Nguyễn An Nhiên',
      email: 'annhien@example.com',
      role: 'PATIENT',
    });
    const storage = TestBed.inject(CharityProgramStorageService);
    const program = storage.create('PARTNER-A', 'Bếp yêu thương', {
      title: 'Bữa cơm tiếp sức',
      supportType: 'MEAL',
      description: 'Trao suất cơm miễn phí cho bệnh nhân có hoàn cảnh khó khăn.',
      regionId: 'ha-noi',
      city: 'Hà Nội',
      address: 'Bệnh viện K Tân Triều',
      schedule: 'Trưa thứ Bảy hằng tuần',
      capacity: 80,
      contactName: 'Minh Anh',
      phone: '0912345678',
      email: 'minhanh@example.com',
    });
    storage.review(program.id, 'PUBLISHED');
    TestBed.inject(CharityProgramRegistrationService).register(program.id, 'MEMBER-A', 80);
    await TestBed.inject(Router).navigateByUrl(`/?program=${encodeURIComponent(program.id)}`);

    const fixture = TestBed.createComponent(MemberRegistrationsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Chương trình từ nhà hảo tâm');
    expect(element.textContent).toContain('Bữa cơm tiếp sức');
    expect(element.querySelector('.registration-card--highlighted')).not.toBeNull();

    element.querySelector<HTMLButtonElement>('.registration-card__actions button')?.click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Bạn chưa đăng ký chương trình nào');
  });
});
