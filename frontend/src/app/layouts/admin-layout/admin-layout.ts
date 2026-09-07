import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface AdminMenuItem {
  readonly label: string;
  readonly path: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  protected readonly isSidebarOpen = signal(false); // Điều khiển sidebar trên màn hình nhỏ.

  protected readonly menuItems: readonly AdminMenuItem[] = [
    { label: 'Người dùng', path: '/admin/nguoi-dung' },
    { label: 'Kiểm duyệt cộng đồng', path: '/admin/kiem-duyet' },
    { label: 'Quản lý nội dung', path: '/admin/noi-dung' },
    { label: 'Chương trình hỗ trợ', path: '/admin/chuong-trinh' },
    { label: 'Điểm phát cơm', path: '/admin/diem-phat-com' },
  ];

  protected toggleSidebar(): void {
    this.isSidebarOpen.update((isOpen) => !isOpen);
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }
}
