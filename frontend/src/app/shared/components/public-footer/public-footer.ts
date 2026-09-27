import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FooterLink {
  readonly label: string;
  readonly route: string;
  readonly fragment?: string;
}

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './public-footer.html',
  styleUrl: './public-footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicFooter {
  protected readonly currentYear = new Date().getFullYear();

  protected readonly informationLinks: readonly FooterLink[] = [
    { label: 'Trang chủ', route: '/' },
    { label: 'Về chúng tôi', route: '/ve-chung-toi' },
    { label: 'Cẩm nang', route: '/cam-nang' },
    { label: 'Hoạt động', route: '/cong-dong' },
    { label: 'Loại ung thư', route: '/loai-ung-thu' },
    { label: 'Tin tức', route: '/cam-nang' },
    { label: 'Đối tác', route: '/', fragment: 'home-partners' },
  ];

  protected readonly communityLinks: readonly FooterLink[] = [
    { label: 'Tham gia cộng đồng', route: '/cong-dong' },
    { label: 'Chia sẻ câu chuyện', route: '/thanh-vien/bai-viet' },
    { label: 'Quyên góp', route: '/cong-dong', fragment: 'community-donations' },
  ];
}
