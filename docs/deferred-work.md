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
