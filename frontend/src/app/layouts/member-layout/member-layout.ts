import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';

interface MemberMenuItem {
  readonly label: string;
  readonly path: string;
  readonly exact?: boolean;
}

@Component({
  selector: 'app-member-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './member-layout.html',
  styleUrl: './member-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberLayout {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly menuItems: readonly MemberMenuItem[] = [
    { label: 'Tổng quan', path: '/thanh-vien', exact: true },
    { label: 'Hồ sơ của tôi', path: '/thanh-vien/ho-so' },
    { label: 'Bài viết của tôi', path: '/thanh-vien/bai-viet' },
    { label: 'Bình luận của tôi', path: '/thanh-vien/binh-luan' },
    { label: 'Đăng ký hỗ trợ', path: '/thanh-vien/dang-ky-ho-tro' },
  ];

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/dang-nhap');
  }
}
