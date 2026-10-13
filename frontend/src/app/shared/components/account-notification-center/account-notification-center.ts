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

import { AuthService } from '@core/auth/auth.service';
import type { AccountNotification } from '@features/account/services/account-notification-storage.service';
import { AccountNotificationStorageService } from '@features/account/services/account-notification-storage.service';

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

  readonly appearance = input<'icon' | 'mobile'>('icon');
  protected readonly isOpen = signal(false);
  protected readonly userId = computed(() => this.auth.currentUser()?.id ?? '');
  protected readonly notifications = computed(() => {
    this.storage.notifications();
    return this.userId() ? this.storage.notificationsFor(this.userId()) : [];
  });
  protected readonly unreadCount = computed(() => {
    this.storage.notifications();
    return this.userId() ? this.storage.unreadCountFor(this.userId()) : 0;
  });

  protected toggle(event: Event): void {
    event.stopPropagation();
    if (!this.isOpen()) this.storage.refreshRemote();
    this.isOpen.update((isOpen) => !isOpen);
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
