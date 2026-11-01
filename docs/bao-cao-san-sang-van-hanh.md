# Báo cáo giao diện, tích hợp API/mock và mức sẵn sàng vận hành

Ngày kiểm tra: 01/11/2026

Phạm vi: `frontend/`, `backend/`, `shared/support-data/`
Commit nền đang kiểm tra: `3345f5a` trên nhánh `main`

## 1. Kết luận điều hành

Ứng dụng đã có đầy đủ khung giao diện Angular, backend NestJS/Prisma và nhiều luồng nghiệp vụ nối API. Môi trường local hiện chạy được, database đã cập nhật đủ 35 migration và các health check đều đạt.

Mức đánh giá hiện tại:

| Mục tiêu | Đánh giá |
|---|---|
| Demo nội bộ/local | **Đạt** |
| UAT có kiểm soát | **Đạt điều kiện kỹ thuật cơ bản; cần chạy kịch bản UAT** |
| Vận hành production thực tế | **Chưa đạt** |
| Mức sẵn sàng ước tính | **Khoảng 75%** |

Lý do chưa đạt production: chưa có E2E staging, cấu hình email/AI/Google Maps còn phụ thuộc bí mật hoặc dịch vụ ngoài, production cần reverse proxy `/api`, cần đánh giá dependency audit và còn một số phần đang dùng dữ liệu mock/local-storage.

## 2. Bằng chứng chạy hiện tại

- Frontend: `http://127.0.0.1:4200` trả HTTP 200.
- Backend live: `http://127.0.0.1:3000/health/live` trả HTTP 200.
- Backend ready: `http://127.0.0.1:3000/health/ready` trả HTTP 200.
- `prisma migrate status`: **Database schema is up to date**, 35/35 migration.
- `frontend: ng build`: thành công.
- `backend: nest build`: thành công.
- Các thay đổi auth, bình luận/cảm xúc, parser JSON, profile/search, chương trình hỗ trợ và quyên góp đã được review theo nhóm; frontend/backend build và test đều xanh trước khi bàn giao.

## 3. Bản đồ giao diện và luồng kết nối

### 3.1 Khu vực công khai

| Khu vực/route | Luồng chính | Nguồn dữ liệu hiện tại | Trạng thái |
|---|---|---|---|
| `/`, `/cam-nang`, `/cam-nang/:slug` | Trang chủ, cẩm nang, chi tiết bài | API `public/contents`; fallback mock content khi API chưa cấu hình | Đã nối, cần kiểm tra dữ liệu production |
| `/loai-ung-thu`, `/loai-ung-thu/:slug` | Danh sách/chi tiết loại ung thư | API nội dung công khai; mock chỉ khi không có API base | Đã nối |
| `/loai-ung-thu/bai-viet/:slug` | Bài viết theo loại ung thư | API nội dung | Đã nối |
| `/cau-chuyen`, `/cau-chuyen/:slug` | Câu chuyện truyền cảm hứng | API managed resources/member posts và dữ liệu mẫu còn trong UI | Có API, còn dữ liệu mẫu cần phân loại rõ |
| `/goc-tam-ly` | Chia sẻ câu chuyện, bình luận, cảm xúc | API member posts + community engagement; localStorage là fallback/migration | Đã nối; đã sửa idempotency và response bình luận |
| `/tim-kiem` | Tìm kiếm nội dung/chương trình | API `/search`; một phần dữ liệu nội bộ được ghép từ service | Đã nối, cần test dữ liệu lớn |
| `/tro-ly-ai` | Hỏi đáp, hội thoại, gợi ý nguồn | API `/ai/assistant`; backend có local reply/Ollama/OpenAI theo cấu hình | Đã nối; chất lượng/phản hồi phụ thuộc provider |
| `/cong-dong/chuong-trinh-ho-tro` | Xem chương trình, đăng ký hỗ trợ | API managed resources + `/programs/:id/registrations` | Đã nối |
| `/cong-dong/diem-quyen-gop` | Bản đồ/điểm hỗ trợ, chỉ đường | API `/support-points/map` hoặc managed resources; Google Maps key hiện trống ở production config | Có API; chỉ đường/địa mã cần cấu hình Maps |
| `/cong-dong/thu-vien-toc/*` | Đăng ký hiến/nhận tóc, tra cứu mã | API `/community/hair-registrations` | Đã nối |
| `/cong-dong/sao-ke` | Danh sách sao kê/quyên góp gần đây | API `/donations/recent` | Đã nối đọc dữ liệu; nhập/duyệt cần UAT với file thật |
| `/ve-chung-toi` | Trang giới thiệu | Giao diện tĩnh | Hoàn thành |

### 3.2 Khu vực thành viên

| Khu vực/route | Luồng chính | API/mock | Trạng thái |
|---|---|---|---|
| `/dang-nhap`, `/dang-ky` | Đăng nhập/đăng ký, portal PUBLIC/ADMIN | API `/auth/*`; dev có mock fallback khi network fail, production tắt fallback | API đã nối |
| `/xac-minh-email`, `/xac-minh-email-moi` | Xác minh email/đổi email hai bước | API `/auth/verify-email`, `/auth/email-change/*` | Đã nối; cần email provider thật |
| `/quen-mat-khau`, `/dat-lai-mat-khau` | Quên và đặt lại mật khẩu | API `/auth/forgot-password`, `/auth/reset-password` | Đã nối; cần email provider thật |
| `/ho-so` | Hồ sơ, avatar, quyền riêng tư | API `/profile/me`, `/profile/avatar/:userId`; local profile khi auth mode LOCAL | Đã nối; cần test file lớn và storage production |
| `/thanh-vien/bai-viet` | Bài viết cá nhân, nháp, gửi duyệt | API member posts; local migration cho dữ liệu cũ | Đã nối |
| `/thanh-vien/binh-luan` | Danh sách bình luận của tôi | API community comments; local legacy fallback | Đã nối |
| `/thanh-vien/tra-cuu-ma` | Tra cứu đăng ký tóc | API lookup; LOCAL có fallback giao diện | Đã nối |
| `/thanh-vien/chuong-trinh-da-dang-ky` | Xem/hủy đăng ký chương trình | API `/programs/me/registrations` | Đã nối |
| `/thanh-vien/ho-tro` | Đăng ký chương trình hỗ trợ | API program registrations | Đã nối; cần UAT quá hạn/tự hoàn thành |

### 3.3 Khu vực đối tác

| Khu vực/route | Luồng chính | API/mock | Trạng thái |
|---|---|---|---|
| `/doi-tac` | Dashboard đối tác | API dữ liệu quản lý | Đã nối |
| `/doi-tac/dang-ky-doi-tac` | Hồ sơ trở thành đối tác, lưu nháp, gửi duyệt | API `/partner-applications/mine`, documents, submit | Đã nối; phụ thuộc xác minh email |
| `/doi-tac/quan-ly-chuong-trinh` | Tạo/sửa/xóa chương trình hỗ trợ, lịch/địa chỉ | API programs/managed resources | Đã nối; cần kiểm tra bản đồ/tọa độ và timezone |
| `/doi-tac/chuong-trinh-da-dang-ky` | Theo dõi đăng ký chương trình | API registrations | Đã nối |
| `/doi-tac/binh-luan`, `/doi-tac/bai-viet` | Quản lý nội dung cá nhân | API member posts/comments | Đã nối |

### 3.4 Khu vực admin

| Route | Chức năng | API |
|---|---|---|
| `/admin/tong-quan` | Dashboard số liệu | `/admin/dashboard` |
| `/admin/nguoi-dung` | Khóa/mở khóa người dùng | `/admin/users` |
| `/admin/doi-tac`, `/admin/kiem-duyet` | Duyệt hồ sơ đối tác | `/partner-applications/admin` |
| `/admin/noi-dung` | Quản trị nội dung CMS | `/contents`, managed resources |
| `/admin/chuong-trinh` | Duyệt/quản lý chương trình | `/programs`, managed resources |
| `/admin/hien-nhan-toc` | Duyệt hiến/nhận tóc | `/community/hair-registrations/admin` |
| `/admin/diem-phat-com` | Quản lý điểm hỗ trợ/địa điểm | `/support-points`, managed resources |
| `/admin/quyen-gop` | Nhập/kiểm tra/duyệt sao kê | `/admin/donations/inspect`, `/import`, `/review` |

## 4. Chính sách API và mock theo cấu hình

### Development

- `frontend/src/environments/environment.ts` dùng `apiBaseUrl=http://localhost:3000`.
- `useMockAuthFallback=false`: development hiện kiểm thử trực tiếp với backend thật; phiên mock cũ sẽ bị loại khi khởi tạo ứng dụng.
- Backend AI hiện dùng Ollama theo `.env`; nếu Ollama không phản hồi, backend có local reply dự phòng.
- Content có mock data khi API public chưa được cấu hình.
- Một số dữ liệu cũ của profile, bài viết, bình luận và cảm xúc có cơ chế localStorage migration.

### Production

- `environment.production.ts` dùng `apiBaseUrl=/api` và `useMockAuthFallback=false`.
- Cần reverse proxy `/api` từ web server vào backend port 3000; nếu không, bản production sẽ không gọi được API.
- Không được dựa vào mock/localStorage cho nghiệp vụ thật.
- `googleMapsApiKey` đang để trống; phải cấu hình nếu dùng autocomplete/geocoding Google Maps.

## 5. Các luồng đã kiểm chứng trực tiếp trong phiên này

- Đăng nhập remote thành công và nhận đúng vai trò PARTNER.
- Health live/ready backend và frontend đều hoạt động.
- Migration Prisma đã đồng bộ 35/35.
- Tạo/bỏ cảm xúc qua API thành công.
- Tạo bình luận, lấy danh sách và xóa bình luận kiểm thử thành công.
- Sửa lỗi header `x-idempotency-key` cho bình luận/cảm xúc.
- Sửa response comment để frontend hiển thị bình luận vừa đăng và sau khi tải lại.
- Sửa nhận diện cấu hình SMTP trong `AuthService`.

## 6. Kết quả kiểm thử tự động hiện tại

### Frontend

Lệnh: `npm run test:ci`

Kết quả kiểm tra mới nhất ngày 01/11/2026: **102/102 test files passed**; **344/344 tests passed**.

Các test auth đã được đồng bộ với cấu hình tắt mock fallback; test phiên ghi nhớ dùng đúng
`authMode=REMOTE`; test điểm tiếp nhận đã cập nhật theo hợp đồng API phân trang hiện tại.

### Backend

Lệnh: `npm test -- --runInBand`

Kết quả kiểm tra mới nhất ngày 01/11/2026: **60/60 test suites passed**;
**336/336 tests passed**.

Đã xử lý cấu hình Jest/CommonJS cho cache token dashboard, cập nhật mock search và managed
resources, đồng bộ hợp đồng xóa chương trình, AI fallback sources, enum tìm kiếm và pin chính
xác Prisma `6.12.0`. `package-lock.json` đã được đồng bộ lại với `package.json`.

## 7. Rủi ro và việc cần hoàn thành trước vận hành thật

### P0 – bắt buộc

1. Phân loại và xử lý dependency audit hiện báo 33 cảnh báo (2 high, 30 moderate, 1 low); không còn critical sau khi đồng bộ lockfile và không dùng `--force` khi chưa đánh giá breaking change.
2. Đổi toàn bộ secret đã từng xuất hiện trong ảnh/chat, đặc biệt mật khẩu ứng dụng Gmail; đưa secret vào secret manager.
3. Cấu hình reverse proxy HTTPS cho `/api`, cookie `secure`, CORS production và domain thật.
4. Xác nhận backup/restore PostgreSQL và chạy migration trên database staging trước production.

### P1 – cần hoàn thành trước UAT rộng

1. Kiểm thử email xác minh, reset mật khẩu và đổi email với hộp thư thật; kiểm tra Inbox/Spam, token hết hạn và retry/FAILED.
2. Cấu hình Google Maps key, quota, restriction theo domain.
3. Kiểm thử file upload, magic bytes, giới hạn kích thước và storage bền vững.
4. Kiểm thử tự động đóng chương trình quá hạn, lịch hàng tuần, timezone và số chỗ cuối.
5. Kiểm thử nhập sao kê CSV/XLSX, đối soát, duyệt, công khai và rollback.
6. Bổ sung test cạnh tranh cho refresh token, slot cuối và rollback Audit/Outbox.

### P2 – nâng chất lượng vận hành

1. Chốt Swagger/OpenAPI làm source of truth cho frontend.
2. Hoàn thiện retention/xóa notification cũ theo tài liệu deferred work.
3. Bổ sung monitoring, structured logging, alerting và correlation ID ở production.
4. Có smoke test sau deploy cho login, email, chương trình, tóc, bình luận và quyên góp.

## 8. Checklist bàn giao production

- [x] CI frontend xanh (102/102 test files, 344/344 test).
- [x] CI backend xanh (60/60 test suites, 336/336 test).
- [ ] E2E staging xanh.
- [ ] `.env` production đặt ngoài repository/secret manager.
- [ ] JWT, database, SMTP/webhook, AI và Maps secrets đã rotate.
- [ ] HTTPS, reverse proxy `/api`, CORS và cookie đã kiểm tra.
- [ ] Database backup/restore đã diễn tập.
- [ ] Email thật đã kiểm thử đủ 3 loại: xác minh, reset, đổi email.
- [ ] Có tài khoản admin khẩn cấp và quy trình thu hồi phiên.
- [ ] Có log/monitoring và kế hoạch rollback.

## 9. Kết luận

Bản hiện tại phù hợp cho **demo nội bộ và bắt đầu UAT có kiểm soát**; frontend và backend test suite đều đã xanh. Không nên mở cho người dùng thật hoặc đưa lên production trước khi hoàn tất E2E staging, dependency/security hardening, cấu hình production và kiểm thử email, Maps, upload, sao kê cùng các luồng cạnh tranh. Các phần API chính đã được dựng tốt; phần còn thiếu chủ yếu là hardening, kiểm thử tích hợp và kỷ luật triển khai.
