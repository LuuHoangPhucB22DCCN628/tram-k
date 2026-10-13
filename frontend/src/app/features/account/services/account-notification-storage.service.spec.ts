import { TestBed } from '@angular/core/testing';

import { AccountNotificationStorageService } from './account-notification-storage.service';

describe('AccountNotificationStorageService', () => {
  let service: AccountNotificationStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountNotificationStorageService);
  });

  afterEach(() => localStorage.clear());

  it('stores notifications per recipient and prevents duplicate events', () => {
    const input = {
      recipientUserId: 'USER-1',
      kind: 'PROGRAM_REGISTRATION_CONFIRMED' as const,
      title: 'Đăng ký đã được xác nhận',
      message: 'Bạn đã được xác nhận tham gia.',
      link: '/thanh-vien/chuong-trinh-da-dang-ky',
      dedupeKey: 'registration:1:confirmed',
    };

    expect(service.create(input)).not.toBeNull();
    expect(service.create(input)).toBeNull();
    expect(service.notificationsFor('USER-1')).toHaveLength(1);
    expect(service.notificationsFor('USER-2')).toHaveLength(0);
  });

  it('marks one or all unread notifications as read', () => {
    const first = service.create({
      recipientUserId: 'USER-1',
      kind: 'PROGRAM_REGISTRATION_SENT',
      title: 'Đã gửi đăng ký',
      message: 'Đăng ký đang chờ xác nhận.',
      link: '/thanh-vien/chuong-trinh-da-dang-ky',
    })!;
    service.create({
      recipientUserId: 'USER-1',
      kind: 'PROGRAM_REGISTRATION_CONFIRMED',
      title: 'Đã xác nhận',
      message: 'Đăng ký đã được xác nhận.',
      link: '/thanh-vien/chuong-trinh-da-dang-ky',
    });

    expect(service.unreadCountFor('USER-1')).toBe(2);
    expect(service.markRead(first.id, 'USER-1')).toBe(true);
    expect(service.unreadCountFor('USER-1')).toBe(1);
    expect(service.markAllRead('USER-1')).toBe(1);
    expect(service.unreadCountFor('USER-1')).toBe(0);
  });
});
