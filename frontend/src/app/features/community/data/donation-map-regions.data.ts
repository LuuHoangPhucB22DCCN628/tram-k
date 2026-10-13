export interface DonationMapRegion {
  readonly id: string;
  readonly svgId: string;
  readonly name: string;
}

export const DONATION_MAP_REGIONS: readonly DonationMapRegion[] = [
  { id: 'bac-ninh', svgId: 'BN', name: 'Bắc Ninh' },
  { id: 'ca-mau', svgId: 'CM', name: 'Cà Mau' },
  { id: 'cao-bang', svgId: 'CB', name: 'Cao Bằng' },
  { id: 'dien-bien', svgId: 'DB', name: 'Điện Biên' },
  { id: 'dong-nai', svgId: 'DN', name: 'Đồng Nai' },
  { id: 'gia-lai', svgId: 'GL', name: 'Gia Lai' },
  { id: 'ha-tinh', svgId: 'HT', name: 'Hà Tĩnh' },
  { id: 'hai-phong', svgId: 'HP', name: 'Hải Phòng' },
  { id: 'an-giang', svgId: 'AG', name: 'An Giang' },
  { id: 'lao-cai', svgId: 'LC', name: 'Lào Cai' },
  { id: 'lam-dong', svgId: 'LD', name: 'Lâm Đồng' },
  { id: 'lang-son', svgId: 'LS', name: 'Lạng Sơn' },
  { id: 'nghe-an', svgId: 'NA', name: 'Nghệ An' },
  { id: 'ninh-binh', svgId: 'NB', name: 'Ninh Bình' },
  { id: 'khanh-hoa', svgId: 'KH', name: 'Khánh Hòa' },
  { id: 'dak-lak', svgId: 'DL', name: 'Đắk Lắk' },
  { id: 'da-nang', svgId: 'DN_2', name: 'Đà Nẵng' },
  { id: 'hue', svgId: 'H', name: 'Huế' },
  { id: 'quang-ngai', svgId: 'QN', name: 'Quảng Ngãi' },
  { id: 'quang-ninh', svgId: 'QN_2', name: 'Quảng Ninh' },
  { id: 'can-tho', svgId: 'CT', name: 'Cần Thơ' },
  { id: 'son-la', svgId: 'SL', name: 'Sơn La' },
  { id: 'tay-ninh', svgId: 'TN', name: 'Tây Ninh' },
  { id: 'hung-yen', svgId: 'HY', name: 'Hưng Yên' },
  { id: 'thai-nguyen', svgId: 'TN_2', name: 'Thái Nguyên' },
  { id: 'thanh-hoa', svgId: 'TH', name: 'Thanh Hóa' },
  { id: 'quang-tri', svgId: 'QN_3', name: 'Quảng Trị' },
  { id: 'dong-thap', svgId: 'DT', name: 'Đồng Tháp' },
  { id: 'ho-chi-minh', svgId: 'HCM', name: 'Thành phố Hồ Chí Minh' },
  { id: 'tuyen-quang', svgId: 'TQ', name: 'Tuyên Quang' },
  { id: 'vinh-long', svgId: 'VL', name: 'Vĩnh Long' },
  { id: 'phu-tho', svgId: 'PT', name: 'Phú Thọ' },
  { id: 'lai-chau', svgId: 'LC_2', name: 'Lai Châu' },
  { id: 'ha-noi', svgId: 'HN', name: 'Hà Nội' },
];

export function donationRegionIdFromName(value: string): string | null {
  const normalizedValue = normalizeRegionName(value);
  return (
    DONATION_MAP_REGIONS.find((region) => {
      const normalizedName = normalizeRegionName(region.name);
      return normalizedValue === normalizedName || normalizedValue.includes(normalizedName);
    })?.id ?? null
  );
}

function normalizeRegionName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/^(thanh pho|tinh)\s+/, '')
    .trim();
}
