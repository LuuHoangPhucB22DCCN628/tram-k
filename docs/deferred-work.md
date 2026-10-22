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

- **Trạng thái:** Hoãn đến BE 10.
- **Việc còn lại:**
  1. Chuyển các service gọi trực tiếp `NotificationsService` sang ghi `OutboxEvent` trong transaction.
  2. Viết Worker (Cron/BullMQ) xử lý OutboxEvent.
  3. Cron job xóa Notification cũ > 90 ngày.

## Kiểm thử tích hợp và Cạnh tranh (E2E / Concurrency)

- **Trạng thái:** Đã viết test E2E và thêm bước chạy vào CI; kết quả trên GitHub Actions vẫn cần xác nhận.
- **Đã hoàn thành:**
  1. Cấu hình thành công môi trường E2E local (DB riêng, extension `pg_trgm`).
  2. Viết test code cho Ranking toàn cục (Search) và Magic Bytes (Media).
- **Cần xác nhận:**
  1. Chạy workflow `Backend CI` trên GitHub Actions và xác nhận step E2E pass.
- **Việc còn lại (chuyển sang BE 12):**
  1. Viết test giả lập 2 request đồng thời (Promise.all) cho: tranh slot cuối, refresh token.
  2. Viết test kiểm tra rollback (Audit/Outbox lỗi thì nghiệp vụ chính rollback).

## Blockers cần Team quyết định

1. **OpenAPI Source of truth:** Chốt việc dùng Swagger sinh tự động từ NestJS làm chuẩn cho Frontend. (Hiện tại đang dùng file `content-api-contract.md` viết tay).
2. **Migration Owner:** Cử 1 người chịu trách nhiệm review schema/migration trước khi merge vào `main`.
