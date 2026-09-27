import { CancerFact, CancerType } from '../models/cancer-type.models';

export const CANCER_FACTS: readonly CancerFact[] = [
  {
    label: 'Ca mắc mới mỗi năm',
    value: '180.480',
    description: 'ca mắc mới được ghi nhận trong năm 2022.',
  },
  {
    label: 'Ca tử vong mỗi năm',
    value: '120.184',
    description: 'Một trong những nguyên nhân tử vong hàng đầu.',
  },
  {
    label: 'Sống chung với ung thư',
    value: '409.144',
    description: 'bệnh nhân đang được theo dõi và điều trị.',
  },
  {
    label: 'Tỷ lệ sống sau 5 năm',
    value: '51,6%',
    description: 'Nhờ phát hiện và điều trị kịp thời.',
  },
];

export const CANCER_TYPES: readonly CancerType[] = [
  {
    slug: 'ung-thu-vu',
    name: 'Ung thư vú',
    summary: 'Một trong ba loại ung thư phổ biến được Trạm K ưu tiên giới thiệu.',
    image: '/assets/images/cancer-types/common-cancers-figma.png',
    imageAlt: 'Minh họa ba loại ung thư phổ biến',
    featured: true,
  },
  {
    slug: 'ung-thu-phoi',
    name: 'Ung thư phổi',
    summary: 'Thông tin cơ bản giúp người bệnh và gia đình hiểu đúng hơn về bệnh.',
    image: '/assets/images/cancer-types/common-cancers-figma.png',
    imageAlt: 'Minh họa ba loại ung thư phổ biến',
    featured: true,
  },
  {
    slug: 'ung-thu-tuyen-giap',
    name: 'Ung thư tuyến giáp',
    summary: 'Nhận biết, chẩn đoán và đồng hành trong quá trình điều trị.',
    image: '/assets/images/cancer-types/common-cancers-figma.png',
    imageAlt: 'Minh họa ba loại ung thư phổ biến',
    featured: true,
  },
  {
    slug: 'ung-thu-co-tu-cung',
    name: 'Cổ tử cung',
    summary: 'Loại ung thư có số ca mắc mới cao tại Việt Nam.',
    image: '/assets/images/cancer-types/cervical.png',
    imageAlt: 'Minh họa kiểm tra và chăm sóc cổ tử cung',
  },
  {
    slug: 'ung-thu-dai-truc-trang',
    name: 'Đại trực tràng',
    summary: 'Kiến thức cơ bản về ung thư đại trực tràng.',
    image: '/assets/images/cancer-types/colorectal.png',
    imageAlt: 'Minh họa đại trực tràng và quá trình kiểm tra',
  },
  {
    slug: 'ung-thu-gan',
    name: 'Gan',
    summary: 'Kiến thức cơ bản về ung thư gan.',
    image: '/assets/images/cancer-types/liver.png',
    imageAlt: 'Minh họa gan và quá trình kiểm tra',
  },
  {
    slug: 'ung-thu-mau',
    name: 'Máu',
    summary: 'Kiến thức cơ bản về các bệnh ung thư máu.',
    image: '/assets/images/cancer-types/blood.png',
    imageAlt: 'Minh họa xét nghiệm và theo dõi bệnh ung thư máu',
  },
  {
    slug: 'ung-thu-da-day',
    name: 'Dạ dày',
    summary: 'Kiến thức cơ bản về ung thư dạ dày.',
    image: '/assets/images/cancer-types/stomach.png',
    imageAlt: 'Minh họa dạ dày và quá trình kiểm tra',
  },
  {
    slug: 'ung-thu-tuyen-tien-liet',
    name: 'Tuyến tiền liệt',
    summary: 'Kiến thức cơ bản về ung thư tuyến tiền liệt.',
    image: '/assets/images/cancer-types/prostate.png',
    imageAlt: 'Minh họa tuyến tiền liệt và tư vấn y tế',
  },
  {
    slug: 'ung-thu-vom-hong',
    name: 'Vòm họng',
    summary: 'Kiến thức cơ bản về ung thư vòm họng.',
    image: '/assets/images/cancer-types/nasopharyngeal.png',
    imageAlt: 'Minh họa vòm họng và quá trình kiểm tra',
  },
];
