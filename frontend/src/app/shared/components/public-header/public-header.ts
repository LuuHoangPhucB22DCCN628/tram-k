import { Component, signal } from '@angular/core'; // Component và trạng thái phản ứng cho menu mobile
import { RouterLink, RouterLinkActive } from '@angular/router'; // Điều hướng nội bộ không tải lại trang

@Component({
  selector: 'app-public-header', // Tên thẻ dùng để đặt header vào layout
  standalone: true, // Component hoạt động độc lập, không cần NgModule
  imports: [RouterLink, RouterLinkActive], // Cho phép template sử dụng routerLink
  templateUrl: './public-header.html', // File chứa cấu trúc giao diện
  styleUrl: './public-header.scss', // File chứa SCSS riêng của header
})
export class PublicHeader {
  readonly isMobileMenuOpen = signal(false); // false: đóng menu, true: mở menu

  readonly upcomingMenuItems = [ // Các mục sẽ được nối route khi từng trang hoàn thành
    'Loại ung thư',
    'Góc tâm lý',
    'Cẩm nang',
    'Cộng đồng',
    'Chương trình hỗ trợ',
  ];

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((isOpen) => !isOpen); // Đảo trạng thái khi bấm nút menu
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false); // Đóng menu sau khi chọn một liên kết
  }
}
