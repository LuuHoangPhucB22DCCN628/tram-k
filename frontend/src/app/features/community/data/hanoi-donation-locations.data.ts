export interface DonationLocationMarker {
  readonly id: string;
  readonly regionId: string;
  readonly label: string;
  readonly title: string;
  readonly image: string;
  readonly description: readonly string[];
  readonly emphasis?: string;
  readonly schedule: string;
  readonly address: string;
  readonly contactName: string;
  readonly phone: string;
  readonly status: 'ACTIVE' | 'INACTIVE';
  readonly mapTopPercent: number;
  readonly mapLeftPercent: number;
}

export const HANOI_DONATION_LOCATIONS: readonly DonationLocationMarker[] = [
  {
    id: 'tan-trieu',
    regionId: 'ha-noi',
    label: 'Viện K Tân Triều',
    title: 'Viện K Tân Triều',
    image: '/assets/images/community/community-location-tan-trieu.png',
    description: [
      'Mái ấm An Yên là ngôi nhà 0 đồng dành cho bệnh nhân và người nhà bệnh nhân có hoàn cảnh khó khăn, mang đến nơi lưu trú miễn phí, an toàn và ấm áp trong thời gian điều trị tại Hà Nội.',
      'Bên cạnh việc hỗ trợ chỗ ở, Mái ấm An Yên còn duy trì các bữa cơm thiện nguyện được nấu và phát vào thứ Tư và Chủ Nhật hằng tuần tại Bệnh viện K Tân Triều, góp phần sẻ chia gánh nặng với những người đang trên hành trình chiến đấu với bệnh tật.',
    ],
    emphasis: 'Một mái nhà bình yên – Một điểm tựa yêu thương. ♥',
    schedule: 'Thứ Tư & Chủ Nhật (hàng tuần)',
    address: 'Viện K Tân Triều, Số 30 Cầu Bươu, Phường Thanh Liệt, Thành phố Hà Nội.',
    contactName: 'Mái ấm An Yên',
    phone: 'Đang cập nhật',
    status: 'ACTIVE',
    mapTopPercent: 47.7,
    mapLeftPercent: 61.47,
  },
  {
    id: 'ung-buou-ha-noi',
    regionId: 'ha-noi',
    label: 'Bệnh viện Ung Bướu Hà Nội',
    title: 'Bệnh viện Ung Bướu Hà Nội',
    image: '/assets/images/community/community-location-ung-buou-ha-noi.png',
    description: [
      'Cứ vào mỗi sáng thứ Bảy hằng tuần, Bếp chay Từ Ân tổ chức hoạt động phát cơm chay 0 đồng cho các bệnh nhân đang điều trị tại Bệnh viện Ung Bướu Hà Nội.',
      'Bếp chay Từ Ân là dự án tặng cơm chay 0 đồng cho bệnh nhân, người nghèo và người có hoàn cảnh khó khăn. Những hộp cơm, bát cháo ấm tình người không chỉ là sự động viên mà còn giúp người bệnh vơi bớt khó khăn và an tâm điều trị.',
    ],
    schedule: 'Sáng thứ Bảy (hàng tuần)',
    address: 'Bệnh viện Ung Bướu Hà Nội, Số 42A Thanh Nhàn, Phường Bạch Mai, Thành phố Hà Nội.',
    contactName: 'Bếp chay Từ Ân',
    phone: 'Đang cập nhật',
    status: 'ACTIVE',
    mapTopPercent: 42.98,
    mapLeftPercent: 65.07,
  },
  {
    id: 'vien-y-hoc-quan-doi',
    regionId: 'ha-noi',
    label: 'Viện Y học phóng xạ và Ung bướu Quân đội',
    title: 'Viện Y học phóng xạ và Ung bướu Quân đội',
    image: '/assets/images/community/community-location-army-hospital.png',
    description: [
      'Từ gần một năm nay, “cơm thiện nguyện” đã trở nên quen thuộc với các bệnh nhân nghèo điều trị tại Viện Y học phóng xạ và Ung bướu Quân đội, quận Hoàng Mai (Hà Nội). Chỉ đơn giản với vài ba món chay và cơm trắng, những “đầu bếp” cao tuổi đến từ miền Tây của bếp cơm “Từ Tâm” đang truyền đi giá trị lớn hơn cả hành động “Lá lành đùm lá rách”: đó là tấm lòng của người nghèo vì người nghèo.',
    ],
    schedule: 'Các ngày trong tuần',
    address:
      'Viện Y học phóng xạ và Ung bướu Quân đội, Số 18 Định Công Thượng, Phường Định Công, Thành phố Hà Nội.',
    contactName: 'Bếp cơm Từ Tâm',
    phone: 'Đang cập nhật',
    status: 'ACTIVE',
    mapTopPercent: 41.56,
    mapLeftPercent: 70.13,
  },
];
