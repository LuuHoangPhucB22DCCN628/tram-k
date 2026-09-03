import { Component, signal } from '@angular/core'; // Component và trạng thái phản ứng cho menu mobile
import { RouterLink } from '@angular/router'; // Điều hướng về trang chủ không tải lại trang

@Component({
  selector: 'app-public-header', // Tên thẻ dùng để đặt header vào layout
  standalone: true, // Component hoạt động độc lập, không cần NgModule
  imports: [RouterLink], // Cho phép logo điều hướng về trang chủ
  templateUrl: './public-header.html', // File chứa cấu trúc giao diện
  styleUrl: './public-header.scss', // File chứa SCSS riêng của header
})
export class PublicHeader {
  readonly isMobileMenuOpen = signal(false); // false: đóng menu, true: mở menu

  readonly menuItems = [ // Thứ tự menu lấy từ header HOME trong Figma
    'Cẩm nang',
    'Loại ung thư',
    'Câu chuyện truyền cảm hứng',
    'Cộng đồng',
    'Góc tâm lý và tinh thần',
    'Về chúng tôi',
  ];

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((isOpen) => !isOpen); // Đảo trạng thái khi bấm nút menu
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false); // Đóng menu sau khi chọn một liên kết
  }
}
