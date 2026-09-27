import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ContentApiError } from '../models/content.models';
import { ContentMockApiService } from './content-mock-api.service';

describe('ContentMockApiService', () => {
  let service: ContentMockApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContentMockApiService);
  });

  it('returns only published content with the shared pagination contract', async () => {
    const result = await firstValueFrom(service.list());

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(6);
    expect(result.items).toHaveLength(6);
    expect(result.totalItems).toBe(23);
    expect(result.totalPages).toBe(4);
    expect(result.items.some((item) => item.slug === 'noi-dung-dang-cho-kiem-duyet')).toBe(false);
    expect(result.items[0]).not.toHaveProperty('medicalDisclaimer');
    expect(result.items[0]).not.toHaveProperty('sections');
  });

  it('filters by kind and searches Vietnamese text without requiring accents', async () => {
    const result = await firstValueFrom(service.list({ kind: 'GUIDE', search: 'hoa tri' }));

    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.slug)).toEqual(
      expect.arrayContaining([
        'hoa-tri-la-gi-va-dien-ra-nhu-the-nao',
        'luu-y-dinh-duong-trong-thoi-gian-hoa-tri',
      ]),
    );
  });

  it('filters by category and tag before applying pagination', async () => {
    const result = await firstValueFrom(
      service.list({
        kind: 'GUIDE',
        categorySlug: 'cham-soc',
        tagSlug: 'tu-cham-soc',
      }),
    );

    expect(result.totalItems).toBe(3);
    expect(
      result.items.every(
        (item) =>
          item.category.slug === 'cham-soc' && item.tags.some((tag) => tag.slug === 'tu-cham-soc'),
      ),
    ).toBe(true);
  });

  it('returns an empty page when the requested page is beyond the result', async () => {
    const result = await firstValueFrom(service.list({ page: 5, pageSize: 6 }));

    expect(result.page).toBe(5);
    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(23);
  });

  it('returns a published detail and rejects a draft slug', async () => {
    const detail = await firstValueFrom(service.getBySlug('STORY', 'mot-ngay-mot-buoc-nho'));
    expect(detail.title).toBe('Mỗi ngày là một bước nhỏ');

    await expect(
      firstValueFrom(service.getBySlug('GUIDE', 'noi-dung-dang-cho-kiem-duyet')),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ContentApiError>>({
        code: 'CONTENT_NOT_FOUND',
      }),
    );
  });

  it('returns the complete hydration guide for the shared detail page', async () => {
    const detail = await firstValueFrom(
      service.getBySlug('GUIDE', 'tam-quan-trong-cua-viec-uong-du-nuoc'),
    );

    expect(detail.category.name).toBe('Chế độ dinh dưỡng');
    expect(detail.sections).toHaveLength(5);
    expect(detail.sections.some((section) => section.bullets?.length)).toBe(true);
    expect(detail.sections.filter((section) => section.image)).toHaveLength(2);
  });

  it('keeps the nutrition card order, copy and image mapping aligned with Figma', async () => {
    const result = await firstValueFrom(
      service.list({ kind: 'GUIDE', categorySlug: 'dinh-duong', pageSize: 16 }),
    );

    expect(
      result.items.map((item) => ({
        title: item.title,
        image: item.coverImage.url,
      })),
    ).toEqual([
      {
        title: 'Tháp chế độ dinh dưỡng cho bệnh nhân ung thư',
        image: '/assets/images/guides/nutrition-01.png',
      },
      {
        title: 'Tầm quan trọng của việc uống đủ nước mỗi ngày',
        image: '/assets/images/guides/nutrition-02.png',
      },
      {
        title: 'Nên ăn gì khi cơ thể thường xuyên mệt mỏi?',
        image: '/assets/images/guides/nutrition-03.png',
      },
      {
        title: 'Cách bổ sung protein phù hợp cho người bệnh',
        image: '/assets/images/guides/nutrition-04.png',
      },
    ]);
  });

  it('keeps the signs card copy and image mapping aligned with Figma', async () => {
    const result = await firstValueFrom(
      service.list({ kind: 'GUIDE', categorySlug: 'dau-hieu', pageSize: 16 }),
    );

    expect(result.items.map((item) => [item.title, item.excerpt, item.coverImage.url])).toEqual([
      [
        'Các dấu hiệu âm thầm khi ngủ cảnh báo ung thư',
        'Những lưu ý giúp cơ thể duy trì năng lượng và thích nghi tốt hơn với quá trình điều trị.',
        '/assets/images/guides/signs-01.png',
      ],
      [
        'Sụt cân bất thường dù không ăn kiêng',
        'Tình trạng giảm cân nhanh mà không rõ nguyên nhân có thể là dấu hiệu cho thấy cơ thể đang gặp vấn đề sức khỏe.',
        '/assets/images/guides/signs-02.png',
      ],
      [
        'Những thay đổi bất thường trong thói quen bài tiết',
        'Các thay đổi kéo dài trong sinh hoạt hằng ngày có thể là dấu hiệu cảnh báo mà cơ thể đang gửi tới bạn.',
        '/assets/images/guides/signs-03.png',
      ],
      [
        'Ho kéo dài không cải thiện theo thời gian',
        'Nếu tình trạng ho kéo dài nhiều tuần hoặc đi kèm các triệu chứng bất thường khác, bạn nên chủ động thăm khám.',
        '/assets/images/guides/signs-04.png',
      ],
    ]);
  });

  it('keeps the treatment card order, copy and image mapping aligned with Figma', async () => {
    const result = await firstValueFrom(
      service.list({ kind: 'GUIDE', categorySlug: 'dieu-tri', pageSize: 16 }),
    );

    expect(result.items.map((item) => [item.title, item.excerpt, item.coverImage.url])).toEqual([
      [
        'Các phương pháp điều trị ung thư tốt nhất hiện nay',
        'Tùy thuộc vào từng loại ung thư máu mà bệnh nhân mắc phải, bác sĩ sẽ xây dựng phác đồ điều trị sao cho phù hợp nhất.',
        '/assets/images/guides/treatment-01.png',
      ],
      [
        'Hóa trị là gì và diễn ra như thế nào?',
        'Tìm hiểu về phương pháp sử dụng thuốc để tiêu diệt hoặc kiểm soát sự phát triển của tế bào ung thư.',
        '/assets/images/guides/treatment-02.png',
      ],
      [
        'Điều trị đích và những điều cần biết',
        'Một phương pháp hiện đại giúp tác động chính xác vào các đặc điểm riêng của tế bào ung thư.',
        '/assets/images/guides/treatment-03.png',
      ],
      [
        'Những tác dụng phụ thường gặp và cách ứng phó',
        'Nhận biết các tác dụng phụ phổ biến và những biện pháp giúp giảm bớt cảm giác khó chịu trong quá trình điều trị.',
        '/assets/images/guides/treatment-04.png',
      ],
    ]);
  });

  it('keeps the care card order, copy and image mapping aligned with Figma', async () => {
    const result = await firstValueFrom(
      service.list({ kind: 'GUIDE', categorySlug: 'cham-soc', pageSize: 16 }),
    );

    expect(result.items.map((item) => [item.title, item.excerpt, item.coverImage.url])).toEqual([
      [
        'Cách chăm sóc bệnh nhân ung thư tại nhà',
        'Những lưu ý cần thiết để tạo môi trường sinh hoạt an toàn và thoải mái cho người bệnh.',
        '/assets/images/guides/care-01.png',
      ],
      [
        'Vận động nhẹ nhàng và nâng cao chất lượng sống',
        'Các hoạt động phù hợp giúp duy trì thể lực, cải thiện tâm trạng, hỗ trợ quá trình phục hồi.',
        '/assets/images/guides/care-02.png',
      ],
      [
        'Theo dõi sức khỏe và tác dụng phụ điều trị',
        'Nhận biết các thay đổi của cơ thể để kịp thời trao đổi với bác sĩ và có hướng xử lý phù hợp.',
        '/assets/images/guides/care-03.png',
      ],
      [
        'Những lưu ý về dinh dưỡng trong thời gian hóa trị',
        'Những lưu ý giúp cơ thể duy trì năng lượng và thích nghi tốt hơn với quá trình điều trị.',
        '/assets/images/guides/care-04.png',
      ],
    ]);
    expect(result.items[0].coverImage.crop).toEqual({
      widthPercent: 238.67,
      heightPercent: 142.06,
      leftPercent: -81.37,
      topPercent: 0,
    });
  });

  it('provides complete non-placeholder detail content for every published guide', async () => {
    const list = await firstValueFrom(service.list({ kind: 'GUIDE', pageSize: 16 }));
    const details = await Promise.all(
      list.items.map((item) => firstValueFrom(service.getBySlug('GUIDE', item.slug))),
    );

    expect(details).toHaveLength(16);
    expect(details.every((item) => item.sections.length >= 4)).toBe(true);
    expect(
      details.some((item) =>
        item.sections.some((section) =>
          section.paragraphs.some((paragraph) => paragraph.includes('dữ liệu mẫu')),
        ),
      ),
    ).toBe(false);
  });

  it('returns unique categories for the selected content kind', async () => {
    const categories = await firstValueFrom(service.getCategories('GUIDE'));
    const ids = categories.map((category) => category.id);

    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
