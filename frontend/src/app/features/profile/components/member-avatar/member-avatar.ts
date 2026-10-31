import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '@core/auth/auth.service';
import { API_BASE_URL } from '@core/config/api-base-url.token';

@Component({
  selector: 'app-member-avatar',
  standalone: true,
  template: `@if (imageUrl()) {
      <img [src]="imageUrl()" alt="" (error)="imageUrl.set(null)" />
    } @else {
      <span aria-hidden="true">{{ name.slice(0, 1) }}</span>
    }`,
  styles: `
    :host {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      overflow: hidden;
      border-radius: 50%;
      background: #ede7ff;
      color: #5e4dcb;
      text-transform: uppercase;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberAvatar implements OnInit, OnDestroy {
  @Input() userId?: string;
  @Input({ required: true }) name = '';

  private readonly http = inject(HttpClient, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly apiBaseUrl = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');
  private readonly auth = inject(AuthService);
  private objectUrl: string | null = null;
  readonly imageUrl = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.userId) return;
    const currentUser = this.auth.currentUser();
    if (currentUser?.id === this.userId && currentUser.avatarUrl) {
      this.imageUrl.set(currentUser.avatarUrl);
      return;
    }
    if (!this.http || !this.apiBaseUrl) return;
    this.http
      .get(`${this.apiBaseUrl}/profile/avatar/${encodeURIComponent(this.userId)}`, {
        responseType: 'blob',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.objectUrl = URL.createObjectURL(blob);
          this.imageUrl.set(this.objectUrl);
        },
        error: () => this.imageUrl.set(null),
      });
  }

  ngOnDestroy(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }
}
