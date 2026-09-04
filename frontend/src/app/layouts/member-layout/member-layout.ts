import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
  protected readonly menuItems: readonly MemberMenuItem[] = [
    { label: 'Tổng quan', path: '/thanh-vien', exact: true },
    { label: 'Hồ sơ của tôi', path: '/thanh-vien/ho-so' },
    { label: 'Bài viết của tôi', path: '/thanh-vien/bai-viet' },
    { label: 'Bình luận của tôi', path: '/thanh-vien/binh-luan' },
    { label: 'Đăng ký hỗ trợ', path: '/thanh-vien/dang-ky-ho-tro' },
  ];
}
