import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';

import {
  HairRegistrationLookupApiService,
  type HairRegistrationLookup,
  type HairRegistrationLookupMode,
  type HairRegistrationLookupStatus,
} from '../../services/hair-registration-lookup-api.service';

@Component({
  selector: 'app-hair-registration-lookup-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './hair-registration-lookup-page.html',
  styleUrl: './hair-registration-lookup-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HairRegistrationLookupPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly api = inject(HairRegistrationLookupApiService);
  private lookupSubscription: Subscription | null = null;

  protected readonly code = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly reconnectRequired = signal(false);
  protected readonly result = signal<HairRegistrationLookup | null>(null);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const reference = params.get('ma')?.trim().toUpperCase() ?? '';
      if (reference) {
        this.code.set(reference);
        this.lookup();
      }
    });
  }

  protected onCodeInput(event: Event): void {
    this.lookupSubscription?.unsubscribe();
    this.code.set((event.target as HTMLInputElement).value.toUpperCase());
    this.loading.set(false);
    this.error.set('');
    this.reconnectRequired.set(false);
    this.result.set(null);
  }

  protected lookup(event?: Event): void {
    event?.preventDefault();
    this.lookupSubscription?.unsubscribe();
    const reference = this.code().trim().toUpperCase();
    this.loading.set(false);
    this.result.set(null);
    this.error.set('');
    this.reconnectRequired.set(false);
    if (!/^TK-\d{8}-[A-F0-9]{8}$/.test(reference)) {
      this.error.set('Mã đăng ký chưa đúng định dạng. Ví dụ: TK-20261017-AB12CD34.');
      return;
    }

    this.code.set(reference);
    if (this.auth.authMode() === 'LOCAL') {
      this.error.set(
        'Tài khoản đang ở chế độ thử ngoại tuyến. Vui lòng đăng nhập lại khi máy chủ hoạt động để tra cứu hồ sơ đã gửi.',
      );
      this.reconnectRequired.set(true);
      return;
    }

    this.loading.set(true);
    this.lookupSubscription = this.api
      .lookup(reference)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (registration) => {
          this.result.set(registration);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          switch (error.status) {
            case 0:
              this.error.set(
                'Không kết nối được máy chủ Trạm K. Vui lòng thử lại khi máy chủ hoạt động.',
              );
              break;
            case 401:
              this.error.set(
                'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tra cứu hồ sơ.',
              );
              this.reconnectRequired.set(true);
              break;
            case 404:
              this.error.set('Không tìm thấy mã đăng ký trong tài khoản này.');
              break;
            default:
              this.error.set('Máy chủ gặp lỗi khi tra cứu. Vui lòng thử lại sau.');
          }
          this.loading.set(false);
        },
      });
  }

  protected reconnect(): void {
    this.auth.logout();
    void this.router.navigate(['/dang-nhap'], {
      queryParams: { returnUrl: `/tra-cuu-ma?ma=${encodeURIComponent(this.code().trim())}` },
    });
  }

  protected modeLabel(mode: HairRegistrationLookupMode): string {
    return mode === 'DONATE' ? 'Hiến tóc' : 'Nhận tóc';
  }

  protected statusLabel(status: HairRegistrationLookupStatus): string {
    const labels: Record<HairRegistrationLookupStatus, string> = {
      PENDING: 'Đang chờ xét duyệt',
      APPROVED: 'Đã xác nhận',
      REJECTED: 'Đã từ chối',
      COMPLETED: 'Đã hoàn tất',
    };
    return labels[status];
  }
}
