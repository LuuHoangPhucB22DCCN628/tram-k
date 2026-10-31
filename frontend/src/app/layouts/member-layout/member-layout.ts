import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { PublicFooter } from '@shared/components/public-footer/public-footer';
import { PublicHeader } from '@shared/components/public-header/public-header';

interface MemberMenuItem {
  readonly label: string;
  readonly path: string;
  readonly exact?: boolean;
}

@Component({
  selector: 'app-member-layout',
  standalone: true,
  imports: [PublicHeader, PublicFooter, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './member-layout.html',
  styleUrl: './member-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberLayout {
  protected readonly auth = inject(AuthService);
  protected readonly isSidebarOpen = signal(false);

  protected readonly menuItems = computed<readonly MemberMenuItem[]>(() =>
    this.auth.currentUser()?.role === 'PARTNER'
      ? [
          { label: 'Hồ sơ', path: '/doi-tac/ho-so' },
          { label: 'Bài viết', path: '/doi-tac/bai-viet' },
          { label: 'Bình luận', path: '/doi-tac/binh-luan' },
          { label: 'Tra cứu mã đăng ký', path: '/doi-tac/tra-cuu-ma' },
          {
            label: 'Các chương trình đã đăng ký',
            path: '/doi-tac/chuong-trinh-da-dang-ky',
          },
          { label: 'Đăng ký hỗ trợ', path: '/doi-tac/dang-ky-ho-tro' },
          {
            label: 'Quản lý chương trình từ thiện',
            path: '/doi-tac/quan-ly-chuong-trinh',
          },
        ]
      : [
          { label: 'Hồ sơ', path: '/thanh-vien/ho-so' },
          { label: 'Bài viết', path: '/thanh-vien/bai-viet' },
          { label: 'Bình luận', path: '/thanh-vien/binh-luan' },
          { label: 'Tra cứu mã đăng ký', path: '/thanh-vien/tra-cuu-ma' },
          {
            label: 'Đăng ký trở thành đối tác',
            path: '/thanh-vien/dang-ky-doi-tac',
          },
          {
            label: 'Các chương trình đã đăng ký',
            path: '/thanh-vien/chuong-trinh-da-dang-ky',
          },
        ],
  );

  protected toggleSidebar(): void {
    this.isSidebarOpen.update((isOpen) => !isOpen);
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    this.closeSidebar();
  }
}
