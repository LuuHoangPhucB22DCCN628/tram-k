import { ChangeDetectionStrategy, Component, signal } from '@angular/core'; // Component và trạng thái phản ứng cho menu mobile
import { RouterLink, RouterLinkActive } from '@angular/router'; // Điều hướng nội bộ không tải lại trang

interface PublicMenuItem {
  readonly label: string;
  readonly path: string;
}

@Component({
  selector: 'app-public-header', // Tên thẻ dùng để đặt header vào layout
  standalone: true, // Component hoạt động độc lập, không cần NgModule
  imports: [RouterLink, RouterLinkActive], // Cho phép liên kết và đánh dấu mục đang mở
  templateUrl: './public-header.html', // File chứa cấu trúc giao diện
  styleUrl: './public-header.scss', // File chứa SCSS riêng của header
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHeader {
  readonly isMobileMenuOpen = signal(false); // false: đóng menu, true: mở menu

  readonly menuItems: readonly PublicMenuItem[] = [
    // Thứ tự menu lấy từ header HOME trong Figma
    { label: 'Cẩm nang', path: '/cam-nang' },
    { label: 'Loại ung thư', path: '/loai-ung-thu' },
    { label: 'Câu chuyện truyền cảm hứng', path: '/cau-chuyen' },
    { label: 'Cộng đồng', path: '/cong-dong' },
    { label: 'Góc tâm lý và tinh thần', path: '/goc-tam-ly' },
    { label: 'Về chúng tôi', path: '/ve-chung-toi' },
  ];

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((isOpen) => !isOpen); // Đảo trạng thái khi bấm nút menu
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false); // Đóng menu sau khi chọn một liên kết
  }
}
