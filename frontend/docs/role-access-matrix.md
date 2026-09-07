# Ma trận quyền truy cập — P3-08

Ma trận này là hợp đồng quyền phía frontend của Phase 3. Ký hiệu: ✅ được truy cập, ❌ bị chuyển hướng.

| Vai trò                     | Trang công khai | `/thanh-vien`    | `/doi-tac`          | `/admin`            | Request tới API Trạm K                       |
| --------------------------- | --------------- | ---------------- | ------------------- | ------------------- | -------------------------------------------- |
| Khách                       | ✅              | ❌ Đăng nhập     | ❌ Đăng nhập        | ❌ Đăng nhập        | Không gửi bearer token                       |
| Thành viên / Người chăm sóc | ✅              | ✅               | ❌ Về `/thanh-vien` | ❌ Về `/thanh-vien` | Gửi token; backend kiểm tra quyền tài nguyên |
| Đối tác                     | ✅              | ❌ Về `/doi-tac` | ✅                  | ❌ Về `/doi-tac`    | Gửi token; backend kiểm tra role `PARTNER`   |
| Admin                       | ✅              | ❌ Về `/admin`   | ❌ Về `/admin`      | ✅                  | Gửi token; backend kiểm tra role `ADMIN`     |

## Các điều kiện đã tự động hóa

- Khách vào route được bảo vệ phải tới đăng nhập và giữ `returnUrl`.
- Mỗi vai trò chỉ vào đúng khu vực của mình; truy cập sai được chuyển về trang mặc định đúng vai trò.
- Bearer token chỉ gắn vào URL thuộc API Trạm K, tuyệt đối không gắn vào URL bên ngoài.
- Request của Khách không có bearer token.
- Phản hồi `403 Forbidden` được giữ nguyên, không thử refresh token như lỗi `401`.
- Backend vẫn là lớp bắt buộc quyết định `401/403`; guard frontend chỉ bảo vệ luồng giao diện.

Test liên quan: `auth.guard.spec.ts`, `auth.service.spec.ts`, `auth.interceptor.spec.ts`.
