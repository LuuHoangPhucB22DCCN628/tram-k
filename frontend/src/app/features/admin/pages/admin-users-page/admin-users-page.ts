import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  UiBadge,
  type UiBadgeVariant,
  UiButton,
  UiCard,
  UiEmptyState,
  UiInput,
  UiModal,
  UiPagination,
} from '@shared/ui';

type UserStatus = 'ACTIVE' | 'PENDING' | 'LOCKED';
type UserRole = 'Bệnh nhân' | 'Người thân' | 'Đối tác' | 'Admin';

interface AdminUser {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly role: UserRole;
  readonly joinedAt: string;
  readonly status: UserStatus;
}

const MOCK_USERS: readonly AdminUser[] = [
  {
    id: 'USR-001',
    displayName: 'Nguyễn Minh Anh',
    email: 'minhanh@example.com',
    role: 'Bệnh nhân',
    joinedAt: '02/09/2026',
    status: 'ACTIVE',
  },
  {
    id: 'USR-002',
    displayName: 'Trần Thu Phương',
    email: 'phuong@example.com',
    role: 'Người thân',
    joinedAt: '01/09/2026',
    status: 'PENDING',
  },
  {
    id: 'USR-003',
    displayName: 'Lê Hoàng Nam',
    email: 'hoangnam@example.com',
    role: 'Đối tác',
    joinedAt: '28/08/2026',
    status: 'ACTIVE',
  },
  {
    id: 'USR-004',
    displayName: 'Phạm Ngọc Lan',
    email: 'ngoclan@example.com',
    role: 'Bệnh nhân',
    joinedAt: '25/08/2026',
    status: 'LOCKED',
  },
  {
    id: 'USR-005',
    displayName: 'Đỗ Văn Bình',
    email: 'vanbinh@example.com',
    role: 'Người thân',
    joinedAt: '22/08/2026',
    status: 'ACTIVE',
  },
  {
    id: 'USR-006',
    displayName: 'Vũ Hải Yến',
    email: 'haiyen@example.com',
    role: 'Bệnh nhân',
    joinedAt: '20/08/2026',
    status: 'ACTIVE',
  },
  {
    id: 'USR-007',
    displayName: 'Bùi Đức Long',
    email: 'duclong@example.com',
    role: 'Đối tác',
    joinedAt: '18/08/2026',
    status: 'PENDING',
  },
  {
    id: 'USR-008',
    displayName: 'Admin Trạm K',
    email: 'admin@tramk.local',
    role: 'Admin',
    joinedAt: '01/08/2026',
    status: 'ACTIVE',
  },
];

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [RouterLink, UiBadge, UiButton, UiCard, UiEmptyState, UiInput, UiModal, UiPagination],
  templateUrl: './admin-users-page.html',
  styleUrl: './admin-users-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPage {
  private readonly pageSize = 5;

  protected readonly users = signal<readonly AdminUser[]>(MOCK_USERS);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<UserStatus | 'ALL'>('ALL');
  protected readonly currentPage = signal(1);
  protected readonly selectedUser = signal<AdminUser | null>(null);

  protected readonly filteredUsers = computed(() => {
    const keyword = this.searchTerm().trim().toLocaleLowerCase('vi');
    const status = this.statusFilter();

    return this.users().filter((user) => {
      const matchesKeyword =
        !keyword ||
        user.displayName.toLocaleLowerCase('vi').includes(keyword) ||
        user.email.toLocaleLowerCase('vi').includes(keyword) ||
        user.id.toLocaleLowerCase('vi').includes(keyword);
      const matchesStatus = status === 'ALL' || user.status === status;
      return matchesKeyword && matchesStatus;
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize)),
  );

  protected readonly pagedUsers = computed(() => {
    const validPage = Math.min(this.currentPage(), this.totalPages());
    const start = (validPage - 1) * this.pageSize;
    return this.filteredUsers().slice(start, start + this.pageSize);
  });

  protected readonly activeUserCount = computed(
    () => this.users().filter((user) => user.status === 'ACTIVE').length,
  );
  protected readonly pendingUserCount = computed(
    () => this.users().filter((user) => user.status === 'PENDING').length,
  );
  protected readonly lockedUserCount = computed(
    () => this.users().filter((user) => user.status === 'LOCKED').length,
  );

  protected updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected updateStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as UserStatus | 'ALL');
    this.currentPage.set(1);
  }

  protected openStatusConfirmation(user: AdminUser): void {
    this.selectedUser.set(user);
  }

  protected closeStatusConfirmation(): void {
    this.selectedUser.set(null);
  }

  protected confirmStatusChange(): void {
    const selectedUser = this.selectedUser();
    if (!selectedUser) return;

    const nextStatus: UserStatus = selectedUser.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    this.users.update((users) =>
      users.map((user) => (user.id === selectedUser.id ? { ...user, status: nextStatus } : user)),
    );
    this.closeStatusConfirmation();
  }

  protected statusLabel(status: UserStatus): string {
    return { ACTIVE: 'Đang hoạt động', PENDING: 'Chờ xác minh', LOCKED: 'Đã khóa' }[status];
  }

  protected statusVariant(status: UserStatus): UiBadgeVariant {
    return { ACTIVE: 'success', PENDING: 'warning', LOCKED: 'danger' }[status] as UiBadgeVariant;
  }
}
