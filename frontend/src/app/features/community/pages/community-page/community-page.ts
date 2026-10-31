import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { CommunityLoveTitle } from '../../components/community-love-title/community-love-title';
import { AdminDonationsApiService, PublicDonationSummary } from '@features/admin/services/admin-donations-api.service';

interface HairLibraryCard {
  readonly title: string;
  readonly description: string;
  readonly action: string;
  readonly tone: 'neutral' | 'soft';
  readonly route: string;
}

interface DonationStat {
  readonly value: string;
  readonly label: string;
  readonly icon: string;
}

interface DonationRow {
  readonly id: string;
  readonly name: string;
  readonly time: string;
  readonly amount: string;
}

interface FundDetail {
  readonly icon: string;
  readonly value: string;
}

interface DirectDonationBrand {
  readonly name: string;
  readonly description: string;
  readonly image: string;
  readonly imageStyle: 'cover' | 'contain' | 'wide';
}

@Component({
  selector: 'app-community-page',
  standalone: true,
  imports: [RouterLink, CommunityLoveTitle, RevealDirective],
  templateUrl: './community-page.html',
  styleUrl: './community-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityPage {
  private readonly donationsApi = inject(AdminDonationsApiService);
  private readonly donationSummary = signal<PublicDonationSummary | null>(null);
  protected readonly donationsLoading = signal(true);
  protected readonly donationsError = signal(false);
  private readonly donationDetails = [
    'Ngân hàng TMCP Ngoại thương Việt Nam',
    '123 567 890',
    'Quỹ Nhân ái Trạm K',
  ].join('\n');

  protected readonly hairLibraryCards: readonly HairLibraryCard[] = [
    {
      title: 'Người nhận tóc',
      description:
        'Một mái tóc mới không chỉ giúp thay đổi diện mạo mà còn góp phần mang lại sự tự tin, niềm vui và cảm giác được đồng hành trong những ngày điều trị.',
      action: 'Nhận hỗ trợ',
      tone: 'neutral',
      route: '/cong-dong/thu-vien-toc/nhan-toc',
    },
    {
      title: 'Người hiến tóc',
      description:
        'Mỗi đóng góp là một tia hy vọng, giúp bệnh nhân có thêm cơ hội tiếp tục điều trị và vững bước phía trước.',
      action: 'Trao tia hy vọng',
      tone: 'soft',
      route: '/cong-dong/thu-vien-toc/hien-toc',
    },
  ];

  protected readonly donationStats = computed<readonly DonationStat[]>(() => [
    {
      value: this.donationSummary() ? `${new Intl.NumberFormat('vi-VN').format(BigInt(this.donationSummary()!.totalAmountVnd))} đ` : '—',
      label: 'Tổng đóng góp',
      icon: '/assets/images/community/community-stat-total.svg',
    },
    {
      value: this.donationSummary() ? new Intl.NumberFormat('vi-VN').format(this.donationSummary()!.totalCount) : '—',
      label: 'Lượt quyên góp',
      icon: '/assets/images/community/community-stat-donations.svg',
    },
    {
      value: '—',
      label: 'Bệnh nhân được hỗ trợ',
      icon: '/assets/images/community/community-stat-patients.svg',
    },
  ]);

  protected readonly donations = computed<readonly DonationRow[]>(() => (this.donationSummary()?.items ?? []).map((entry) => ({
    id: `QG-${entry.id.slice(-8).toUpperCase()}`,
    name: entry.name,
    time: new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(entry.occurredAt)),
    amount: `${new Intl.NumberFormat('vi-VN').format(BigInt(entry.amountVnd))}đ`,
  })));

  protected readonly fundDetails: readonly FundDetail[] = [
    {
      icon: '/assets/images/community/community-bank.svg',
      value: 'Ngân hàng TMCP Ngoại thương Việt Nam',
    },
    {
      icon: '/assets/images/community/community-account.svg',
      value: '123 567 890',
    },
    {
      icon: '/assets/images/community/community-fund.svg',
      value: 'Quỹ Nhân ái Trạm K',
    },
  ];

  protected readonly directDonationBrands: readonly DirectDonationBrand[] = [
    {
      name: 'Highlands Coffee',
      description:
        'Với mỗi ly nước thuộc chương trình thiện nguyện, 5.000đ sẽ được đóng góp vào quỹ hỗ trợ bệnh nhân ung thư.',
      image: '/assets/images/community/community-brand-highlands.png',
      imageStyle: 'cover',
    },
    {
      name: 'Vinmec',
      description:
        'Một phần doanh thu từ các gói tầm soát được dành cho bệnh nhân có hoàn cảnh khó khăn.',
      image: '/assets/images/community/community-brand-vinmec.png',
      imageStyle: 'cover',
    },
    {
      name: 'Pharmacity',
      description:
        'Mỗi đơn hàng từ 300.000đ sẽ đóng góp một phần vào chương trình suất cơm từ thiện.',
      image: '/assets/images/community/community-brand-pharmacity.png',
      imageStyle: 'cover',
    },
    {
      name: 'Guardian',
      description:
        'Khách hàng quyên góp sản phẩm chăm sóc cá nhân mới cho bệnh nhân đang điều trị.',
      image: '/assets/images/community/community-brand-guardian.png',
      imageStyle: 'cover',
    },
    {
      name: 'The Coffee House',
      description:
        'Mỗi hóa đơn kèm lời nhắn sẽ được quy đổi thành khoản đóng góp cho thư viện tóc.',
      image: '/assets/images/community/community-brand-coffee-house.png',
      imageStyle: 'cover',
    },
    {
      name: "Biti's",
      description:
        'Mỗi đôi giày trong bộ sưu tập thiện nguyện sẽ đóng góp một phần doanh thu cho quỹ hỗ trợ.',
      image: '/assets/images/community/community-brand-bitis.png',
      imageStyle: 'contain',
    },
    {
      name: 'FPT Shop',
      description:
        'Khách hàng có thể làm tròn hóa đơn để quyên góp trực tiếp cho bệnh nhân ung thư.',
      image: '/assets/images/community/community-brand-fpt-shop.png',
      imageStyle: 'wide',
    },
    {
      name: 'Muji',
      description: 'Trích doanh thu từ một số sản phẩm để hỗ trợ bệnh nhân có hoàn cảnh khó khăn.',
      image: '/assets/images/community/community-brand-muji.png',
      imageStyle: 'contain',
    },
  ];

  protected readonly copyLabel = signal('Sao chép thông tin');

  constructor() {
    this.donationsApi.publicList().subscribe({
      next: (summary) => { this.donationSummary.set(summary); this.donationsLoading.set(false); },
      error: () => { this.donationsError.set(true); this.donationsLoading.set(false); },
    });
  }

  protected async copyDonationDetails(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.donationDetails);
      this.copyLabel.set('Đã sao chép');
    } catch {
      this.copyLabel.set('Không thể sao chép');
    }
  }
}
