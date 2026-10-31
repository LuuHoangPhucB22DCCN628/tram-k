import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core'; // Component và trạng thái phản ứng cho menu mobile
import { Router, RouterLink, RouterLinkActive } from '@angular/router'; // Điều hướng nội bộ không tải lại trang

import { AuthService } from '@core/auth/auth.service';
import { AccountNotificationCenter } from '../account-notification-center/account-notification-center';

interface PublicMenuItem {
  readonly label: string;
  readonly path: string;
}

interface AccountMenuItem {
  readonly label: string;
  readonly path: string;
  readonly group?: 'support';
}

@Component({
  selector: 'app-public-header', // Tên thẻ dùng để đặt header vào layout
  standalone: true, // Component hoạt động độc lập, không cần NgModule
  imports: [RouterLink, RouterLinkActive, AccountNotificationCenter], // Cho phép liên kết và đánh dấu mục đang mở
  templateUrl: './public-header.html', // File chứa cấu trúc giao diện
  styleUrl: './public-header.scss', // File chứa SCSS riêng của header
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHeader {
  @ViewChild('mobileMenuButton') private mobileMenuButton?: ElementRef<HTMLButtonElement>;

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly isMobileMenuOpen = signal(false); // false: đóng menu, true: mở menu
  readonly isAccountMenuOpen = signal(false);

  readonly menuItems: readonly PublicMenuItem[] = [
    // Thứ tự menu lấy từ header HOME trong Figma
    { label: 'Cẩm nang', path: '/cam-nang' },
    { label: 'Loại ung thư', path: '/loai-ung-thu' },
    { label: 'Câu chuyện truyền cảm hứng', path: '/cau-chuyen' },
    { label: 'Cộng đồng', path: '/cong-dong' },
    { label: 'Góc tâm lý và tinh thần', path: '/goc-tam-ly' },
  ];

  readonly accountMenuItems = computed<readonly AccountMenuItem[]>(() => {
    switch (this.auth.currentUser()?.role) {
      case 'PATIENT':
      case 'CARER':
        return [
          { label: 'Hồ sơ', path: '/thanh-vien/ho-so' },
          { label: 'Bài viết', path: '/thanh-vien/bai-viet' },
          { label: 'Bình luận', path: '/thanh-vien/binh-luan' },
          { label: 'Tra cứu mã đăng ký', path: '/thanh-vien/tra-cuu-ma' },
          { label: 'Đăng ký trở thành đối tác', path: '/thanh-vien/dang-ky-doi-tac' },
          {
            label: 'Các chương trình đã đăng ký',
            path: '/thanh-vien/chuong-trinh-da-dang-ky',
          },
        ];
      case 'PARTNER':
        return [
          { label: 'Hồ sơ', path: '/doi-tac/ho-so' },
          { label: 'Bài viết', path: '/doi-tac/bai-viet' },
          { label: 'Bình luận', path: '/doi-tac/binh-luan' },
          { label: 'Tra cứu mã đăng ký', path: '/doi-tac/tra-cuu-ma' },
          { label: 'Các chương trình đã đăng ký', path: '/doi-tac/chuong-trinh-da-dang-ky' },
          { label: 'Đăng ký hỗ trợ', path: '/doi-tac/dang-ky-ho-tro', group: 'support' },
          { label: 'Quản lý chương trình từ thiện', path: '/doi-tac/quan-ly-chuong-trinh' },
        ];
      case 'ADMIN':
        return [{ label: 'Trang quản trị', path: '/admin' }];
      default:
        return [];
    }
  });

  readonly accountInitials = computed(() => {
    const displayName = this.auth.currentUser()?.displayName.trim() ?? '';
    if (!displayName) return 'TK';
    return displayName
      .split(/\s+/)
      .slice(-2)
      .map((part) => part.charAt(0).toLocaleUpperCase('vi'))
      .join('');
  });

  readonly accountRoleLabel = computed(() => {
    switch (this.auth.currentUser()?.role) {
      case 'PATIENT':
        return 'Bệnh nhân';
      case 'CARER':
        return 'Người nhà bệnh nhân';
      case 'PARTNER':
        return 'Nhà hảo tâm';
      case 'ADMIN':
        return 'Quản trị viên';
      default:
        return '';
    }
  });

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((isOpen) => !isOpen); // Đảo trạng thái khi bấm nút menu
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false); // Đóng menu sau khi chọn một liên kết
  }

  toggleAccountMenu(event: Event): void {
    event.stopPropagation();
    this.isAccountMenuOpen.update((isOpen) => !isOpen);
  }

  closeAccountMenu(): void {
    this.isAccountMenuOpen.set(false);
  }

  closeAllMenus(): void {
    this.closeMobileMenu();
    this.closeAccountMenu();
  }

  logout(): void {
    this.auth.logout();
    this.closeAllMenus();
    void this.router.navigateByUrl('/');
  }

  @HostListener('document:click')
  protected handleDocumentClick(): void {
    this.closeAccountMenu();
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    const shouldRestoreMobileFocus = this.isMobileMenuOpen();
    this.closeMobileMenu();
    this.closeAccountMenu();
    if (shouldRestoreMobileFocus) {
      queueMicrotask(() => this.mobileMenuButton?.nativeElement.focus());
    }
  }
}
