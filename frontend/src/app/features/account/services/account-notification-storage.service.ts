import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';

import { AccountNotificationApiService } from './account-notification-api.service';

export type AccountNotificationKind =
  | 'STORY_SUBMITTED'
  | 'STORY_PUBLISHED'
  | 'STORY_REJECTED'
  | 'STORY_COMMENT'
  | 'STORY_REPLY'
  | 'STORY_REACTION'
  | 'PROGRAM_REGISTRATION_SENT'
  | 'PROGRAM_REGISTRATION_RECEIVED'
  | 'PROGRAM_REGISTRATION_CONFIRMED'
  | 'PROGRAM_REGISTRATION_REJECTED'
  | 'PROGRAM_REGISTRATION_COMPLETED'
  | 'PROGRAM_PUBLISHED'
  | 'PROGRAM_REJECTED'
  | 'PROGRAM_DELETED'
  | 'PARTNER_APPLICATION_APPROVED'
  | 'PARTNER_APPLICATION_REJECTED'
  | 'HAIR_REGISTRATION_SENT'
  | 'HAIR_REGISTRATION_APPROVED'
  | 'HAIR_REGISTRATION_REJECTED'
  | 'HAIR_REGISTRATION_COMPLETED';

export interface AccountNotification {
  readonly id: string;
  readonly recipientUserId: string;
  readonly kind: AccountNotificationKind;
  readonly title: string;
  readonly message: string;
  readonly link: string;
  readonly createdAt: string;
  readonly readAt?: string;
  readonly dedupeKey?: string;
}

export type CreateAccountNotificationInput = Omit<
  AccountNotification,
  'id' | 'createdAt' | 'readAt'
>;

@Injectable({ providedIn: 'root' })
export class AccountNotificationStorageService {
  private readonly storageKey = 'tram-k.account-notifications';
  private readonly auth = inject(AuthService);
  private readonly api = inject(AccountNotificationApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationsState = signal<readonly AccountNotification[]>(this.read());
  private readonly refreshedPartnerApprovals = new Set<string>();
  private lastRemoteUserId = '';

  readonly notifications = this.notificationsState.asReadonly();

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (!user || this.auth.authMode() !== 'REMOTE') {
        this.lastRemoteUserId = '';
        return;
      }
      if (this.lastRemoteUserId === user.id) return;
      this.lastRemoteUserId = user.id;
      this.refreshRemote();
    });
    interval(30_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshRemote());
  }

  notificationsFor(userId: string): readonly AccountNotification[] {
    return this.notificationsState()
      .filter((notification) => notification.recipientUserId === userId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  unreadCountFor(userId: string): number {
    return this.notificationsState().filter(
      (notification) => notification.recipientUserId === userId && !notification.readAt,
    ).length;
  }

  create(input: CreateAccountNotificationInput): AccountNotification | null {
    if (
      input.dedupeKey &&
      this.notificationsState().some(
        (notification) =>
          notification.recipientUserId === input.recipientUserId &&
          notification.dedupeKey === input.dedupeKey,
      )
    ) {
      return null;
    }

    const notification: AccountNotification = {
      ...input,
      id: `NOTIFICATION-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.persist([notification, ...this.notificationsState()]);
    return notification;
  }

  refreshRemote(): void {
    const user = this.auth.currentUser();
    if (!user || this.auth.authMode() !== 'REMOTE') return;
    this.api.list().subscribe((page) => {
      if (!page) return;
      const partnerApproval = page.items.find(
        (notification) => notification.kind === 'PARTNER_APPLICATION_APPROVED',
      );
      if (
        partnerApproval &&
        user.role !== 'PARTNER' &&
        !this.refreshedPartnerApprovals.has(partnerApproval.id)
      ) {
        this.refreshedPartnerApprovals.add(partnerApproval.id);
        this.auth.refreshAccessToken().subscribe();
      }
      const remoteIds = new Set(page.items.map((notification) => notification.id));
      const preserved = this.notificationsState().filter(
        (notification) =>
          notification.recipientUserId !== user.id ||
          notification.id.startsWith('NOTIFICATION-') ||
          !remoteIds.has(notification.id),
      );
      this.persist([...page.items, ...preserved]);
    });
  }

  markRead(notificationId: string, recipientUserId: string): boolean {
    let updated = false;
    const readAt = new Date().toISOString();
    const notifications = this.notificationsState().map((notification) => {
      if (
        notification.id !== notificationId ||
        notification.recipientUserId !== recipientUserId ||
        notification.readAt
      ) {
        return notification;
      }
      updated = true;
      return { ...notification, readAt };
    });
    if (updated) this.persist(notifications);
    if (
      updated &&
      this.auth.authMode() === 'REMOTE' &&
      !notificationId.startsWith('NOTIFICATION-')
    ) {
      this.api.markRead(notificationId).subscribe();
    }
    return updated;
  }

  markAllRead(recipientUserId: string): number {
    const readAt = new Date().toISOString();
    let updatedCount = 0;
    const notifications = this.notificationsState().map((notification) => {
      if (notification.recipientUserId !== recipientUserId || notification.readAt) {
        return notification;
      }
      updatedCount += 1;
      return { ...notification, readAt };
    });
    if (updatedCount) this.persist(notifications);
    if (this.auth.authMode() === 'REMOTE') this.api.markAllRead().subscribe();
    return updatedCount;
  }

  private persist(notifications: readonly AccountNotification[]): void {
    this.notificationsState.set(notifications);
    localStorage.setItem(this.storageKey, JSON.stringify(notifications));
  }

  private read(): readonly AccountNotification[] {
    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) return [];
      const value: unknown = JSON.parse(rawValue);
      return Array.isArray(value) ? value.filter(this.isNotification) : [];
    } catch {
      return [];
    }
  }

  private readonly isNotification = (value: unknown): value is AccountNotification => {
    if (!value || typeof value !== 'object') return false;
    const notification = value as Partial<AccountNotification>;
    return (
      typeof notification.id === 'string' &&
      typeof notification.recipientUserId === 'string' &&
      typeof notification.kind === 'string' &&
      typeof notification.title === 'string' &&
      typeof notification.message === 'string' &&
      typeof notification.link === 'string' &&
      typeof notification.createdAt === 'string' &&
      (notification.readAt === undefined || typeof notification.readAt === 'string') &&
      (notification.dedupeKey === undefined || typeof notification.dedupeKey === 'string')
    );
  };
}
