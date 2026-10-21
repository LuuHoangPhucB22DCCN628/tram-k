# Hợp đồng API nội dung công khai P4-02

Tài liệu này khóa cấu trúc dữ liệu giữa frontend Angular và backend NestJS. `ContentService` dùng REST API khi `API_BASE_URL` được cấu hình; trong môi trường không có backend, service dùng `ContentMockApiService`.

## Response envelope

Các endpoint JSON trả thành công theo dạng `{ "success": true, "data": ... }`. Lỗi JSON dùng `{ "success": false, "error": { "code": "...", "message": ... }, "timestamp": "...", "path": "..." }`; lỗi xác thực đầu vào hiện đặt danh sách thông báo field trong `error.message`.

Các endpoint tải tệp (`GET /media/:fileName` và `GET /partner-applications/documents/:storageKey`) là ngoại lệ transport: thành công trả nội dung nhị phân cùng `Content-Type`/`Content-Disposition`, không bọc JSON; lỗi vẫn theo error envelope.

## Danh sách nội dung

`GET /public/contents`

Query hỗ trợ:

- `kind`: `GUIDE`, `STORY` hoặc `CANCER_TYPE`.
- `search`: tìm trong tiêu đề, mô tả, tên danh mục và thẻ; không phân biệt hoa thường hoặc dấu tiếng Việt.
- `categorySlug`, `tagSlug`, `featured`.
- `page`: số nguyên từ 1, mặc định 1.
- `pageSize`: số nguyên từ 1 đến 48, mặc định 12; giá trị lớn hơn 48 được giới hạn về 48. Trang Cẩm nang có thể yêu cầu 16 để hiển thị đủ bốn nhóm theo Figma.

Response thành công:

```json
{
  "success": true,
  "data": {
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
        "publishedAt": "2026-09-01T01:00:00.000Z",
        "readingMinutes": 6,
        "featured": true
      }
    ],
    "page": 1,
    "pageSize": 12,
    "totalItems": 23,
    "totalPages": 2
  }
}
```

## Chi tiết nội dung

`GET /public/contents/:kind/:slug`

Response dùng envelope `{ "success": true, "data": ... }` và bổ sung `authorName`, `sections`, `sources`, `medicalDisclaimer` và `status`. Nếu slug không tồn tại, sai loại hoặc chưa xuất bản, API trả error envelope theo D06 với HTTP 404.

```json
{
  "success": false,
  "error": {
    "code": "HTTP_404",
    "message": "Nội dung không tồn tại hoặc chưa được xuất bản."
  },
  "timestamp": "2026-10-15T16:00:00.000Z",
  "path": "/public/contents/GUIDE/noi-dung-khong-ton-tai"
}
```

## Danh mục

`GET /public/content-categories?kind=GUIDE`

Trả envelope `{ "success": true, "data": [...] }` với danh mục không trùng lặp, sắp xếp theo tên để frontend dựng bộ lọc.

## Quy tắc nghiệp vụ đã chốt

1. API công khai chỉ trả nội dung có trạng thái `PUBLISHED`.
2. Kết quả nổi bật đứng trước, sau đó sắp xếp ngày xuất bản mới nhất.
3. Lọc và tìm kiếm xảy ra trước phân trang.
4. Slug phải duy nhất trong cùng một `kind`.
5. Ảnh luôn có URL, alt text, chiều rộng và chiều cao gốc.
6. Nội dung y tế phải có cảnh báo không thay thế tư vấn chuyên môn và danh sách nguồn đã được Admin kiểm tra.
7. Trang vượt quá tổng số trang trả `items: []`, không tự chuyển về trang cuối.
