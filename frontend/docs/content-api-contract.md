# Hợp đồng API nội dung công khai P4-02

Tài liệu này khóa cấu trúc dữ liệu giữa frontend Angular của Phúc và backend NestJS của Phương. Trong khi API thật chưa hoàn thành, `ContentService` dùng `ContentMockApiService`. Khi tích hợp backend, các trang vẫn gọi `ContentService` nên không phải sửa lại component.

## Danh sách nội dung

`GET /public/contents`

Query hỗ trợ:

- `kind`: `GUIDE`, `STORY` hoặc `CANCER_TYPE`.
- `search`: tìm trong tiêu đề, mô tả, tên danh mục và thẻ; không phân biệt hoa thường hoặc dấu tiếng Việt.
- `categorySlug`, `tagSlug`, `featured`.
- `page`: số nguyên từ 1, mặc định 1.
- `pageSize`: chỉ nhận 6, 9, 12 hoặc 16; mặc định 6. Trang Cẩm nang dùng 16 để hiển thị đủ bốn nhóm theo Figma.

Response thành công:

```json
{
  "items": [
    {
      "id": "GUIDE-001",
      "kind": "GUIDE",
      "slug": "chuan-bi-truoc-buoi-hoa-tri-dau-tien",
      "title": "Chuẩn bị trước buổi hóa trị đầu tiên",
      "excerpt": "Danh sách những điều người bệnh nên chuẩn bị.",
      "category": {
        "id": "CAT-TREATMENT",
        "name": "Điều trị",
        "slug": "dieu-tri"
      },
      "tags": [{ "name": "Dành cho người mới", "slug": "nguoi-moi" }],
      "coverImage": {
        "url": "/assets/images/home/guide-chemotherapy.png",
        "alt": "Bác sĩ đang trao đổi với người bệnh",
        "width": 1200,
        "height": 628
      },
      "publishedAt": "2026-09-01T08:00:00+07:00",
      "readingMinutes": 6,
      "featured": true
    }
  ],
  "page": 1,
  "pageSize": 6,
  "totalItems": 23,
  "totalPages": 3
}
```

## Chi tiết nội dung

`GET /public/contents/:kind/:slug`

Response bổ sung `authorName`, `sections`, `sources`, `medicalDisclaimer` và `status`. Nếu slug không tồn tại, sai loại hoặc chưa xuất bản, API trả:

```json
{
  "code": "CONTENT_NOT_FOUND",
  "message": "Nội dung không tồn tại hoặc chưa được xuất bản."
}
```

## Danh mục

`GET /public/content-categories?kind=GUIDE`

Trả danh mục không trùng lặp và sắp xếp theo tên để frontend dựng bộ lọc.

## Quy tắc nghiệp vụ đã chốt

1. API công khai chỉ trả nội dung có trạng thái `PUBLISHED`.
2. Kết quả nổi bật đứng trước, sau đó sắp xếp ngày xuất bản mới nhất.
3. Lọc và tìm kiếm xảy ra trước phân trang.
4. Slug phải duy nhất trong cùng một `kind`.
5. Ảnh luôn có URL, alt text, chiều rộng và chiều cao gốc.
6. Nội dung y tế phải có cảnh báo không thay thế tư vấn chuyên môn và danh sách nguồn đã được Admin kiểm tra.
7. Trang vượt quá tổng số trang trả `items: []`, không tự chuyển về trang cuối.
