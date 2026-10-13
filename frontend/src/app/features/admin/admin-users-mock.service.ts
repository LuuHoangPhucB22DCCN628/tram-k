import { Injectable } from '@angular/core';

import type { AdminUser, AdminUserStatus } from './admin-user.models';

const MOCK_USERS: readonly AdminUser[] = [
  {
    id: 'USR-001',
    displayName: 'Nguyễn Minh Anh',
    email: 'minhanh@example.com',
    role: 'Bệnh nhân',
    joinedAt: '02/09/2026',
    status: 'ACTIVE',
    authVersion: 1,
  },
  {
    id: 'USR-002',
    displayName: 'Trần Thu Phương',
    email: 'phuong@example.com',
    role: 'Người thân',
    joinedAt: '01/09/2026',
    status: 'PENDING_VERIFY',
    authVersion: 1,
  },
  {
    id: 'USR-003',
    displayName: 'Lê Hoàng Nam',
    email: 'hoangnam@example.com',
    role: 'Đối tác',
    joinedAt: '28/08/2026',
    status: 'ACTIVE',
    authVersion: 1,
  },
  {
    id: 'USR-004',
    displayName: 'Phạm Ngọc Lan',
    email: 'ngoclan@example.com',
    role: 'Bệnh nhân',
    joinedAt: '25/08/2026',
    status: 'LOCKED',
    authVersion: 2,
  },
  {
    id: 'USR-005',
    displayName: 'Đỗ Văn Bình',
    email: 'vanbinh@example.com',
    role: 'Người thân',
    joinedAt: '22/08/2026',
    status: 'ACTIVE',
    authVersion: 1,
  },
  {
    id: 'USR-006',
    displayName: 'Vũ Hải Yến',
    email: 'haiyen@example.com',
    role: 'Bệnh nhân',
    joinedAt: '20/08/2026',
    status: 'DISABLED',
    authVersion: 2,
  },
  {
    id: 'USR-007',
    displayName: 'Bùi Đức Long',
    email: 'duclong@example.com',
    role: 'Đối tác',
    joinedAt: '18/08/2026',
    status: 'PENDING_VERIFY',
    authVersion: 1,
  },
  {
    id: 'USR-008',
    displayName: 'Admin Trạm K',
    email: 'admin@tramk.local',
    role: 'Admin',
    joinedAt: '01/08/2026',
    status: 'ACTIVE',
    authVersion: 1,
  },
];

@Injectable({ providedIn: 'root' })
export class AdminUsersMockService {
  private readonly storageKey = 'tram-k.admin.users';

  list(): readonly AdminUser[] {
    const rawValue = localStorage.getItem(this.storageKey);
    if (!rawValue) return MOCK_USERS;

    try {
      const users = JSON.parse(rawValue) as AdminUser[];
      return Array.isArray(users) && users.every((user) => this.isValidUser(user))
        ? users
        : MOCK_USERS;
    } catch {
      localStorage.removeItem(this.storageKey);
      return MOCK_USERS;
    }
  }

  updateStatus(userId: string, expectedAuthVersion: number, status: AdminUserStatus): AdminUser {
    let updated: AdminUser | null = null;
    const users = this.list().map((user) => {
      if (user.id !== userId) return user;
      if (user.authVersion !== expectedAuthVersion) {
        throw new Error('Tài khoản đã thay đổi. Vui lòng tải lại dữ liệu.');
      }
      updated = { ...user, status, authVersion: user.authVersion + 1 };
      return updated;
    });
    if (!updated) throw new Error('Không tìm thấy tài khoản.');
    localStorage.setItem(this.storageKey, JSON.stringify(users));
    return updated;
  }

  toggleLocked(userId: string): readonly AdminUser[] {
    const user = this.list().find((item) => item.id === userId);
    if (!user) return this.list();
    this.updateStatus(userId, user.authVersion, user.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED');
    return this.list();
  }

  private isValidUser(user: AdminUser): boolean {
    return Boolean(
      user?.id &&
      user.displayName &&
      user.email &&
      user.role &&
      user.status &&
      Number.isInteger(user.authVersion),
    );
  }
}
