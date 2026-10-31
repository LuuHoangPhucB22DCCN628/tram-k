import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { UrlTree } from '@angular/router';

import { AuthApiError } from '@core/auth/auth.models';
import { AuthService } from '@core/auth/auth.service';
import type { AccountNotification } from '@features/account/services/account-notification-storage.service';
import { AccountNotificationStorageService } from '@features/account/services/account-notification-storage.service';
import { AccountNotificationApiService, type NotificationPreferences } from '@features/account/services/account-notification-api.service';

@Component({
  selector: 'app-account-notification-center',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './account-notification-center.html',
  styleUrl: './account-notification-center.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNotificationCenter {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly storage = inject(AccountNotificationStorageService);
  private readonly notificationApi = inject(AccountNotificationApiService);

  readonly appearance = input<'icon' | 'mobile'>('icon');
  protected readonly isOpen = signal(false);
  protected readonly sendingVerification = signal(false);
  protected readonly verificationFeedback = signal('');
  protected readonly verificationFeedbackIsError = signal(false);
  protected readonly showPreferences = signal(false);
  protected readonly preferences = signal<NotificationPreferences | null>(null);
  protected readonly savingPreferences = signal(false);
  protected readonly preferenceError = signal('');
  protected readonly userId = computed(() => this.auth.currentUser()?.id ?? '');
  protected readonly remoteMode = computed(() => this.auth.authMode() === 'REMOTE');
  protected readonly needsEmailVerification = computed(
    () => this.auth.currentUser()?.status === 'PENDING_VERIFY',
  );
  protected readonly notifications = computed(() => {
    this.storage.notifications();
    return this.userId() ? this.storage.notificationsFor(this.userId()) : [];
  });
  protected readonly storedUnreadCount = computed(() => {
    this.storage.notifications();
    return this.userId() ? this.storage.unreadCountFor(this.userId()) : 0;
  });
  protected readonly unreadCount = computed(
    () => this.storedUnreadCount() + (this.needsEmailVerification() ? 1 : 0),
  );

  protected requestVerification(event: Event): void {
    event.stopPropagation();
    const user = this.auth.currentUser();
    if (!user || !this.needsEmailVerification() || this.sendingVerification()) return;

    this.sendingVerification.set(true);
    this.verificationFeedback.set('');
    this.verificationFeedbackIsError.set(false);
    this.auth.resendVerification(user.email).subscribe({
      next: () => {
        this.sendingVerification.set(false);
        this.verificationFeedback.set(
          'Yêu cầu đã được ghi nhận. Vui lòng kiểm tra hộp thư và mục thư rác.',
        );
      },
      error: (error: unknown) => {
        this.sendingVerification.set(false);
        this.verificationFeedbackIsError.set(true);
        this.verificationFeedback.set(
          error instanceof AuthApiError
            ? error.message
            : 'Chưa thể gửi yêu cầu xác minh. Vui lòng thử lại sau.',
        );
      },
    });
  }

  protected toggle(event: Event): void {
    event.stopPropagation();
    if (!this.isOpen()) this.storage.refreshRemote();
    this.isOpen.update((isOpen) => !isOpen);
  }

  protected togglePreferences(event: Event): void {
    event.stopPropagation();
    this.showPreferences.update((open) => !open);
    if (this.showPreferences()) {
      this.preferenceError.set('');
      this.notificationApi.preferences().subscribe((value) => {
        this.preferences.set(value);
        if (!value) this.preferenceError.set('Không thể tải tùy chọn thông báo. Vui lòng thử lại.');
      });
    }
  }

  protected changePreference(key: keyof NotificationPreferences, event: Event): void {
    const current = this.preferences();
    if (!current || this.savingPreferences()) return;
    const checked = (event.target as HTMLInputElement).checked;
    this.savingPreferences.set(true);
    this.preferenceError.set('');
    this.notificationApi.updatePreferences({ [key]: checked }).subscribe((value) => {
      this.savingPreferences.set(false);
      if (value) this.preferences.set(value);
      else {
        (event.target as HTMLInputElement).checked = current[key];
        this.preferenceError.set('Không thể lưu tùy chọn. Vui lòng thử lại.');
      }
    });
  }

  protected openNotification(notification: AccountNotification): void {
    this.storage.markRead(notification.id, this.userId());
    this.isOpen.set(false);
  }

  protected notificationUrl(notification: AccountNotification): UrlTree {
    return this.router.parseUrl(notification.link);
  }

  protected markAllRead(event: Event): void {
    event.stopPropagation();
    this.storage.markAllRead(this.userId());
  }

  @HostListener('click', ['$event'])
  protected stopInsideClick(event: Event): void {
    event.stopPropagation();
  }

  @HostListener('document:click')
  protected close(): void {
    this.isOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected closeWithEscape(): void {
    this.isOpen.set(false);
  }
}
