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
import { AdminUsersApiService } from '../../admin-users-api.service';

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
  private readonly usersService = inject(AdminUsersApiService);

  protected readonly users = signal<readonly AdminUser[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<AdminUserStatus | 'ALL'>('ALL');
  protected readonly currentPage = signal(1);
  protected readonly selectedUser = signal<AdminUser | null>(null);
  protected readonly selectedStatus = signal<AdminUserStatus | null>(null);
  protected readonly reason = signal('');
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
    () => this.users().filter((user) => user.status === 'PENDING_VERIFY').length,
  );
  protected readonly lockedUserCount = computed(
    () => this.users().filter((user) => user.status === 'LOCKED').length,
  );
  protected readonly disabledUserCount = computed(
    () => this.users().filter((user) => user.status === 'DISABLED').length,
  );

  constructor() {
    this.usersService.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: () => {
        this.feedback.set('Không thể tải danh sách tài khoản. Vui lòng thử lại.');
        this.isLoading.set(false);
      },
    });
  }

  protected updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected updateStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as AdminUserStatus | 'ALL');
    this.currentPage.set(1);
  }

  protected openStatusConfirmation(user: AdminUser, status: AdminUserStatus): void {
    this.selectedUser.set(user);
    this.selectedStatus.set(status);
    this.reason.set('');
  }

  protected closeStatusConfirmation(): void {
    this.selectedUser.set(null);
    this.selectedStatus.set(null);
    this.reason.set('');
  }

  protected confirmStatusChange(): void {
    const selectedUser = this.selectedUser();
    const selectedStatus = this.selectedStatus();
    const reason = this.reason().trim();
    if (!selectedUser || !selectedStatus || reason.length < 10 || this.isSaving()) return;

    this.isSaving.set(true);
    this.usersService.updateStatus(selectedUser, selectedStatus, reason).subscribe({
      next: (updated) => {
        this.users.update((users) =>
          users.map((user) => (user.id === updated.id ? updated : user)),
        );
        this.feedback.set(
          `Đã chuyển tài khoản ${selectedUser.displayName} sang ${this.statusLabel(selectedStatus).toLocaleLowerCase('vi')}.`,
        );
        this.isSaving.set(false);
        this.closeStatusConfirmation();
      },
      error: (error: { readonly error?: { readonly error?: { readonly message?: string } } }) => {
        this.feedback.set(
          error.error?.error?.message ?? 'Không thể thay đổi trạng thái. Vui lòng tải lại dữ liệu.',
        );
        this.isSaving.set(false);
      },
    });
  }

  protected updateReason(event: Event): void {
    this.reason.set((event.target as HTMLTextAreaElement).value);
  }

  protected actionLabel(status: AdminUserStatus | null): string {
    return status ? this.statusLabel(status) : 'thay đổi trạng thái';
  }

  protected statusLabel(status: AdminUserStatus): string {
    return {
      ACTIVE: 'Đang hoạt động',
      PENDING_VERIFY: 'Chờ xác minh',
      LOCKED: 'Đã khóa',
      DISABLED: 'Đã vô hiệu hóa',
    }[status];
  }

  protected statusVariant(status: AdminUserStatus): UiBadgeVariant {
    return {
      ACTIVE: 'success',
      PENDING_VERIFY: 'warning',
      LOCKED: 'danger',
      DISABLED: 'neutral',
    }[status] as UiBadgeVariant;
  }
}
