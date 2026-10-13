import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { AccountNotificationStorageService } from '@features/account/services/account-notification-storage.service';

import { AccountNotificationCenter } from './account-notification-center';

describe('AccountNotificationCenter', () => {
  let fixture: ComponentFixture<AccountNotificationCenter>;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AccountNotificationCenter],
      providers: [provideRouter([])],
    }).compileComponents();
    TestBed.inject(AuthService)
      .login({ email: 'phuc@tramk.vn', password: 'Matkhau123', rememberMe: false })
      .subscribe();
    fixture = TestBed.createComponent(AccountNotificationCenter);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows unread count and supports marking all notifications as read', () => {
    const auth = TestBed.inject(AuthService);
    const storage = TestBed.inject(AccountNotificationStorageService);
    storage.create({
      recipientUserId: auth.currentUser()!.id,
      kind: 'PROGRAM_REGISTRATION_CONFIRMED',
      title: 'Đăng ký đã được xác nhận',
      message: 'Bạn đã được xác nhận tham gia chương trình.',
      link: '/thanh-vien/chuong-trinh-da-dang-ky?program=PROGRAM-A',
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.notification-center__trigger')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.notification-center__badge')?.textContent?.trim()).toBe('1');
    expect(element.querySelector('.notification-center__panel')?.textContent).toContain(
      'Đăng ký đã được xác nhận',
    );
    expect(element.querySelector<HTMLAnchorElement>('.notification-center__item')?.href).toContain(
      'chuong-trinh-da-dang-ky?program=PROGRAM-A',
    );

    element.querySelector<HTMLButtonElement>('.notification-center__header button')!.click();
    fixture.detectChanges();
    expect(storage.unreadCountFor(auth.currentUser()!.id)).toBe(0);
  });
});
