export type AdminUserStatus = 'ACTIVE' | 'PENDING' | 'LOCKED';
export type AdminUserRole = 'Bệnh nhân' | 'Người thân' | 'Đối tác' | 'Admin';

export interface AdminUser {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly role: AdminUserRole;
  readonly joinedAt: string;
  readonly status: AdminUserStatus;
}
