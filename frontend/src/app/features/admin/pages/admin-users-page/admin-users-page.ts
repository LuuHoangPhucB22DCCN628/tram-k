import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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

import type { AdminUser, AdminUserStatus } from '../../admin-user.models';
import { AdminUsersMockService } from '../../admin-users-mock.service';

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
  private readonly usersService = inject(AdminUsersMockService);

  protected readonly users = signal<readonly AdminUser[]>(this.usersService.list());
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<AdminUserStatus | 'ALL'>('ALL');
  protected readonly currentPage = signal(1);
  protected readonly selectedUser = signal<AdminUser | null>(null);
  protected readonly feedback = signal('');

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
    this.statusFilter.set((event.target as HTMLSelectElement).value as AdminUserStatus | 'ALL');
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

    const action = selectedUser.status === 'LOCKED' ? 'mở khóa' : 'khóa';
    this.users.set(this.usersService.toggleLocked(selectedUser.id));
    this.feedback.set(`Đã ${action} tài khoản ${selectedUser.displayName}.`);
    this.closeStatusConfirmation();
  }

  protected statusLabel(status: AdminUserStatus): string {
    return { ACTIVE: 'Đang hoạt động', PENDING: 'Chờ xác minh', LOCKED: 'Đã khóa' }[status];
  }

  protected statusVariant(status: AdminUserStatus): UiBadgeVariant {
    return { ACTIVE: 'success', PENDING: 'warning', LOCKED: 'danger' }[status] as UiBadgeVariant;
  }
}
