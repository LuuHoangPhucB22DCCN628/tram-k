import type { PodcastItem } from '../models/podcast.models';

export const DEFAULT_PODCASTS: readonly PodcastItem[] = [
  {
    id: 'PODCAST-001',
    title: 'Ung Thư Không Phải Là Bệnh, Mà Là Cơ Chế Chữa Lành',
    description: 'Góc nhìn khác về ung thư, cơ thể và hành trình hồi phục từ bên trong.',
    source: 'Sức khỏe Tâm Thân Trí',
    image: '/assets/images/mental-health/podcast-cancer-cells.png',
    imageAlt: 'Hình ảnh tế bào minh họa cho nội dung podcast về ung thư',
    publishedAt: '2026-08-30T07:00:00+07:00',
    status: 'PUBLISHED',
  },
  {
    id: 'PODCAST-002',
    title: "Tự bỏ đói mình hoặc ăn thực dưỡng để 'giết' tế bào ung thư, có nên không?",
    description:
      'Không ít bệnh nhân bị ung thư không mổ, xạ trị mà tự bỏ đói mình hoặc chỉ ăn thực dưỡng.',
    source: 'Sức khỏe Tâm Thân Trí',
    image: '/assets/images/mental-health/podcast-nutrition.png',
    imageAlt: 'Người phụ nữ chuẩn bị một bữa ăn nhiều rau xanh',
    publishedAt: '2026-08-29T07:00:00+07:00',
    status: 'PUBLISHED',
  },
  {
    id: 'PODCAST-003',
    title: 'Lớp Yoga miễn phí: Nơi chữa lành cho các bệnh nhân ung thư',
    description:
      'Những bệnh nhân ung thư tìm thấy được sự yên bình thông qua lớp học Yoga miễn phí.',
    source: 'VOV2',
    image: '/assets/images/mental-health/podcast-yoga.png',
    imageAlt: 'Người tập yoga trong ánh hoàng hôn',
    publishedAt: '2026-08-28T07:00:00+07:00',
    status: 'PUBLISHED',
  },
  {
    id: 'PODCAST-004',
    title: 'Khi người thân cần một khoảng lặng',
    description:
      'Cách hiện diện, lắng nghe và đồng hành mà không tạo thêm áp lực cho người đang điều trị.',
    source: 'Trạm K',
    image: '/assets/images/home/guide-family.png',
    imageAlt: 'Người thân ngồi bên nhau trong một khoảnh khắc sẻ chia',
    publishedAt: '2026-08-27T07:00:00+07:00',
    status: 'PUBLISHED',
  },
  {
    id: 'PODCAST-005',
    title: 'Thở chậm để đi qua một ngày nhiều lo âu',
    description:
      'Một vài phút thực hành đơn giản giúp cơ thể thư giãn và tâm trí tìm lại nhịp bình an.',
    source: 'Trạm K',
    image: '/assets/images/home/guide-mental-health.png',
    imageAlt: 'Minh họa chăm sóc sức khỏe tinh thần và cảm xúc',
    publishedAt: '2026-08-26T07:00:00+07:00',
    status: 'PUBLISHED',
  },
];
