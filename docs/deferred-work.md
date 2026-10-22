# Công việc tạm hoãn

## Tích hợp nhà cung cấp email thật

- Trạng thái: Để sau theo yêu cầu ngày 05/10/2026.
- Phạm vi đã hoàn thành: PostgreSQL và migration; đổi email hai bước của UC04; thu hồi phiên cũ; outbox retry/FAILED; kiểm thử hợp đồng webhook và HTTP webhook cục bộ.
- Kết quả kiểm tra hiện tại: backend đạt 50/50 test và build thành công.
- Việc còn lại:
  1. Chọn nhà cung cấp email và lấy webhook URL/token.
  2. Điền `EMAIL_DELIVERY_MODE=webhook`, `EMAIL_WEBHOOK_URL`, `EMAIL_WEBHOOK_TOKEN`, `EMAIL_FROM` trong cấu hình bí mật của môi trường.
  3. Khởi động lại backend và gửi thử email xác minh, đặt lại mật khẩu, đổi email.
  4. Kiểm tra hộp thư đến/spam, liên kết, thời hạn token và nhật ký retry.
- Điều kiện hoàn thành: cả ba loại email đến hộp thư thật; không ghi token hoặc thông tin bí mật vào log/repository; lỗi nhà cung cấp được retry và chuyển `FAILED` đúng ngưỡng.

## Outbox Pattern và Notification Retention

- Trạng thái: Hoãn đến giai đoạn BE 10 (Outbox và vòng đời sự kiện).
- Phạm vi đã hoàn thành: Bảng Notification có dedupeKey, luồng đánh dấu đã đọc (markRead, markAllRead) và phân trang cursor an toàn (chống lộ dữ liệu).
- Việc còn lại:
  1. Tạo bảng `OutboxEvent` trong schema.prisma.
  2. Refactor các service nghiệp vụ (như `support-program-registrations.service.ts`) để chỉ ghi `OutboxEvent` trong transaction thay vì gọi trực tiếp `NotificationsService`.
  3. Viết Worker chạy ngầm (Cron Job hoặc BullMQ) để xử lý OutboxEvent sau khi transaction commit, bao gồm logic retry khi lỗi.
  4. Xây dựng cron job tự động xóa các Notification cũ hơn 90 ngày (Retention Policy) theo SRS.
- Điều kiện hoàn thành: Không còn gọi trực tiếp NotificationsService trong transaction nghiệp vụ; worker xử lý và chống trùng sự kiện thành công; Notification cũ tự động bị dọn dẹp sau 90 ngày.

## Kiểm thử tích hợp và Cạnh tranh (E2E / Concurrency)

- Trạng thái: Hoãn đến giai đoạn BE 12 (Cutover và kiểm thử tích hợp).
- Phạm vi đã hoàn thành: 100% unit test (157 tests) pass, đã giả lập các case logic (Capacity, Idempotency, Tombstone, Rate limit) thông qua Prisma Mock.
- Việc còn lại:
  1. Cấu hình Jest/Supertest kết nối với PostgreSQL thật (qua Testcontainers hoặc DB test riêng).
  2. Viết test giả lập 2 request đồng thời (Concurrency) cho các case: tranh slot cuối của Registration, xác minh email, refresh token, promote waitlist.
  3. Viết test kiểm tra rollback (nếu Audit/Outbox lỗi thì nghiệp vụ chính phải rollback theo).
  4. Viết test cho Outbox Worker (đảm bảo retry không tạo thông báo trùng).
- Điều kiện hoàn thành: CI chạy E2E xanh trên PostgreSQL thật; không có race condition nào có thể vượt qua capacity hoặc tạo dữ liệu rác.
