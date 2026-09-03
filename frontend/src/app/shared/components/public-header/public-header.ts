import { Component } from '@angular/core'; // Khai báo một Angular component
import { RouterLink, RouterLinkActive } from '@angular/router'; // Điều hướng nội bộ không tải lại trang

@Component({
  selector: 'app-public-header', // Tên thẻ dùng để đặt header vào layout
  standalone: true, // Component hoạt động độc lập, không cần NgModule
  imports: [RouterLink, RouterLinkActive], // Cho phép template sử dụng routerLink
  templateUrl: './public-header.html', // File chứa cấu trúc giao diện
  styleUrl: './public-header.scss', // File chứa SCSS riêng của header
})
export class PublicHeader {} // Hiện tại header chưa cần xử lý dữ liệu
