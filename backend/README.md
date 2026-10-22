# Trạm K --- Backend

Hướng dẫn cài đặt và chạy riêng phần backend của dự án **Trạm K** trên
Windows bằng PowerShell.

## 1. Yêu cầu môi trường

- Git.
- Node.js 22 và npm.
- PostgreSQL đang chạy.
- Một database PostgreSQL dành riêng cho dự án.
- File cấu hình mẫu `backend/.env.example` có trong repository.

Kiểm tra phiên bản:

```powershell
node --version
npm --version
git --version
```

## 2. Lấy mã nguồn

Nếu chưa clone repository:

```powershell
git clone https://github.com/LuuHoangPhucB22DCCN628/tram-k.git
cd tram-k
```

Nếu đã có repository trên máy, mở PowerShell tại thư mục gốc của dự án.

## 3. Cài đặt dependencies

```powershell
cd backend
npm ci
```

`npm ci` cài các package theo lockfile. Nếu lệnh báo lỗi, hãy kiểm tra
phiên bản Node.js và bảo đảm đang chạy lệnh trong thư mục `backend/`.

## 4. Cấu hình biến môi trường

Tạo file `.env` từ file mẫu:

```powershell
Copy-Item .env.example .env
```

Mở `backend/.env` và cấu hình các giá trị phù hợp với máy của bạn. Tối
thiểu cần kiểm tra:

- `DATABASE_URL`: chuỗi kết nối đến database PostgreSQL.
- `JWT_SECRET`: khóa bí mật dùng cho JWT.
- `OUTBOX_ENCRYPTION_KEY`: khóa mã hóa dữ liệu outbox.
- `IP_HASH_SECRET`: khóa bí mật dùng khi băm địa chỉ IP.

Ví dụ định dạng kết nối PostgreSQL:

```dotenv
DATABASE_URL="postgresql://DB_USER:DB_PASSWORD@localhost:5432/DB_NAME?schema=public"
```

Thay `DB_USER`, `DB_PASSWORD` và `DB_NAME` bằng thông tin của database
cục bộ. Đây chỉ là ví dụ định dạng, không phải thông tin đăng nhập có
sẵn.

Tạo các khóa bí mật riêng cho môi trường của bạn theo yêu cầu của cấu
hình dự án. Không dùng lại khóa ví dụ trong môi trường thật và không
commit file `.env`, mật khẩu hoặc khóa bí mật lên Git.

### 4.1. Chạy ở chế độ log (không cần SMTP hoặc webhook)

Khi chỉ phát triển hoặc kiểm thử backend trên máy cá nhân và chưa cần
gửi email thật, đặt biến sau trong `backend/.env`:

```dotenv
EMAIL_DELIVERY_MODE=log
```

Ở chế độ `log`, backend ghi thông tin email xác minh vào log ứng dụng
thay vì gửi qua SMTP hoặc webhook. Vì vậy, bạn **không cần** cấu hình
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_WEBHOOK_URL`
hay `EMAIL_WEBHOOK_TOKEN` để dùng chế độ này.

Sau khi lưu `.env`, khởi động lại backend để cấu hình mới có hiệu lực.
Khi kiểm tra luồng xác minh email, xem log ở terminal chạy
`npm run start:dev`.

### 4.2. Chế độ webhook (tùy chọn)

Chỉ cấu hình webhook nếu bạn chọn `EMAIL_DELIVERY_MODE=webhook` và có
một email gateway tương thích:

```dotenv
EMAIL_DELIVERY_MODE=webhook
EMAIL_WEBHOOK_URL=https://email-gateway.example.com/send
EMAIL_WEBHOOK_TOKEN=replace-with-a-private-webhook-token
```

Thay URL và token bằng thông tin do dịch vụ webhook cung cấp. Không dùng
token ví dụ trong môi trường thật.

### 4.3. Chế độ Gmail SMTP (tùy chọn)

# Chuyển từ chế độ 'log' sang 'smtp' để bật tính năng gửi email thật

EMAIL_DELIVERY_MODE=smtp

# Cấu hình SMTP Gmail

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true

# Điền email Gmail của bạn

SMTP_USER=email_cua_ban@gmail.com

# Điền Mật khẩu ứng dụng (App Password) 16 ký tự vừa tạo (viết liền, không dấu cách)

SMTP_PASS=abcdefghijklmnop

# Cấu hình người gửi (Khuyên dùng chính địa chỉ Gmail bạn dùng gửi)

EMAIL_FROM=Trạm K <email_cua_ban@gmail.com>

Chỉ chọn một chế độ gửi email phù hợp. Không cần điền thông tin webhook
hoặc SMTP khi đang dùng `log`.

# Hướng dẫn tạo Google App Password (Đảm bảo bật Xác minh 2 bước cho tài khoản Google dùng để gửi email )

1. Mở trang quản lý tài khoản Google: https://myaccount.google.com/
2. Vào Bảo mật (Security).
3. Tìm mục Mật khẩu ứng dụng (App passwords). Bạn cũng có thể thử mở trực tiếp: https://myaccount.google.com/apppasswords
4. Đăng nhập lại nếu Google yêu cầu.
5. Đặt tên ứng dụng, ví dụ Tram K Backend.
6. Nhấn Tạo (Create) và sao chép mật khẩu ứng dụng được cấp.

- Lưu ý bảo mật: App Password tương đương thông tin đăng nhập của ứng dụng. Không gửi nó vào chat, không commit lên Git và không đưa vào frontend.

## 5. Tạo Prisma Client và chạy migration

Đảm bảo PostgreSQL đang chạy và database đã được tạo. Từ thư mục
`backend/`, chạy:

```powershell
npm run prisma:generate
npm run db:migrate
```

Lệnh migration áp dụng các migration của dự án lên database được chỉ
định trong `DATABASE_URL`. Kiểm tra kỹ `DATABASE_URL` trước khi chạy, vì
migration sẽ thay đổi schema của database đó.

Để kiểm tra trạng thái migration:

```powershell
npx prisma migrate status
```

Để kiểm tra schema Prisma:

```powershell
npx prisma validate
```

**Lưu ý:** Không dùng `npx prisma migrate reset` trên database có dữ
liệu cần giữ. Lệnh này xóa dữ liệu trong database mục tiêu rồi tạo lại
schema.

## 6. Khởi động backend

```powershell
npm run start:dev
```

Mặc định, API chạy tại:

- API: http://localhost:3000
- Health check: http://localhost:3000/health

Mở đường dẫn health check trên trình duyệt hoặc dùng công cụ HTTP để
kiểm tra ứng dụng đã khởi động.

Dừng server bằng `Ctrl+C` trong terminal đang chạy.

## 7. Khởi động PostgreSQL bằng script của repository (tùy chọn)

Nếu muốn dùng script quản lý PostgreSQL đi kèm repository, đặt các biến
môi trường sau theo đường dẫn cài đặt trên máy:

- `TRAM_K_POSTGRES_ROOT`
- `TRAM_K_POSTGRES_DATA`
- `TRAM_K_POSTGRES_LOGS`

Sau đó chạy từ thư mục `backend/`:

```powershell
npm run db:start
```

Nếu PostgreSQL đã được cài đặt và chạy như một Windows service hoặc theo
cách riêng, có thể tiếp tục sử dụng cách đó thay cho script này.

## 8. Chạy kiểm thử và build

Chạy các bước kiểm tra từ thư mục `backend/`:

```powershell
npx prisma validate
npx prisma migrate status
npx tsc --noEmit
npm test
npm run build
```

Nếu một bước thất bại, hãy xử lý lỗi đó trước khi mở pull request. Không
bỏ qua lỗi build hoặc test chỉ vì server có thể khởi động.

## 9. Lỗi thường gặp

### Không kết nối được PostgreSQL

- Kiểm tra PostgreSQL đã chạy chưa.
- Kiểm tra host, port, tên database, username và password trong
  `DATABASE_URL`.
- Xác nhận database đã được tạo và tài khoản có quyền truy cập.

### Prisma báo thiếu Client hoặc schema chưa đồng bộ

Chạy lại:

```powershell
npm run prisma:generate
npx prisma validate
npx prisma migrate status
```

Nếu migration chưa được áp dụng, kiểm tra `DATABASE_URL` rồi chạy
`npm run db:migrate`.

### Cổng 3000 đang được sử dụng

Kiểm tra tiến trình đang dùng cổng 3000 hoặc điều chỉnh cấu hình cổng
theo cấu hình backend của dự án. Không chạy nhiều bản backend cùng chiếm
một cổng.

### Không gửi được email xác minh

- Kiểm tra `EMAIL_DELIVERY_MODE` và các biến tương ứng với chế độ đang
  dùng.
- Với `log`, kiểm tra log trong terminal chạy backend.
- Với `webhook` hoặc `smtp`, xác nhận URL/thông tin kết nối và thông
  tin xác thực.
- Xem log backend để tìm lỗi gửi email.
- Không chia sẻ `SMTP_PASS`, webhook token hoặc các khóa bí mật khi
  gửi log để nhờ hỗ trợ.

## 10. Quy tắc an toàn và làm việc nhóm

- Không commit `.env`, mật khẩu database, khóa JWT, khóa mã hóa, thông
  tin SMTP, webhook token hoặc API key.
- Không commit `node_modules/` hoặc `dist/`.
- Tạo nhánh riêng cho từng mục tiêu và giữ commit tập trung vào một
  phạm vi thay đổi.
- Trước khi mở pull request, chạy các lệnh kiểm thử ở mục 8.
- Ghi rõ phạm vi thay đổi, cách kiểm thử, migration mới và công việc
  còn lại trong pull request.

Xem README ở thư mục gốc của repository để biết cách chạy frontend
Angular và quy trình làm việc chung của toàn dự án.

## 🧪 Hướng dẫn chạy Integration Test (E2E)

Dự án sử dụng **Jest + Supertest** để chạy Integration Test trên môi trường PostgreSQL thật (nhằm đảm bảo các logic phức tạp như Ranking toàn cục, Concurrency hoạt động chính xác).

### 1. Chuẩn bị Database Test

Mở PostgreSQL (pgAdmin/DBeaver) và tạo một database riêng cho việc test:

```sql
CREATE DATABASE tramk_test_db;
```

**BẮT BUỘC PHẢI GHI.**

Với tư cách là Tech Lead, tôi khẳng định việc này không chỉ là "nên làm" mà là **yêu cầu bắt buộc (Definition of Done)** trong tài liệu hướng dẫn của nhóm bạn.

### Tại sao lại bắt buộc?

1. **Theo tài liệu dự án:** Mục 8.4 (Definition of Done) và phần BE 00 ghi rõ: _"README ghi đúng lệnh setup của Windows và cách dùng PostgreSQL ngoài script đi kèm"_.
2. **Tránh "tự bắn vào chân":** Khi bạn nộp bài cho Giảng viên (hoặc thành viên khác trong nhóm) clone code về chạy, nếu họ gõ `npm run test:e2e` mà không biết phải bật `pg_trgm` hay tạo DB `tramk_test_db`, test sẽ FAIL ngay lập tức. Họ sẽ đánh giá code của bạn là "không chạy được".
3. **Chứng minh năng lực Senior:** Một dự án chuyên nghiệp luôn có hướng dẫn setup môi trường test rõ ràng.

---

### Hướng dẫn viết README (Copy/Paste là xong)

Mở file `README.md` ở thư mục gốc, kéo xuống dưới cùng và dán đoạn Markdown này vào:

````markdown
## 🧪 Hướng dẫn chạy Integration Test (E2E)

Dự án sử dụng **Jest + Supertest** để chạy Integration Test trên môi trường PostgreSQL thật (nhằm đảm bảo các logic phức tạp như Ranking toàn cục, Concurrency hoạt động chính xác).

### 1. Chuẩn bị Database Test

Mở PostgreSQL (pgAdmin/DBeaver) và tạo một database riêng cho việc test:

```sql
CREATE DATABASE tramk_test_db;
```
````

### 2. Kích hoạt Extension (Quan trọng)

Logic tìm kiếm của dự án yêu cầu extension `pg_trgm` để chạy index Gin. Hãy kích hoạt nó trên database test bằng lệnh sau (sử dụng file SQL hoặc chạy trực tiếp trong Query Tool):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 3. Cấu hình biến môi trường

Tạo file `.env.test` ở thư mục `backend/` (file này đã được ignore trong `.gitignore`, không push lên Git):

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/tramk_test_db?schema=public"
JWT_ACCESS_SECRET="test_access_secret"
JWT_REFRESH_SECRET="test_refresh_secret"
JWT_SECRET="tram-k-e2e-only-signing-secret-change-this"
PORT=3001
```

_(Nhớ thay `postgres:password` bằng tài khoản PostgreSQL thực tế trên máy bạn)._

### 4. Đồng bộ cấu trúc bảng & Chạy Test

Chạy các lệnh sau tại thư mục `backend/`:

```bash
# 1. Đồng bộ schema Prisma sang DB test
npx dotenv -e .env.test -- npx prisma db push

# 2. Chạy toàn bộ Integration Test
npm run test:e2e
```

**Lưu ý cho Windows:** Lệnh `test:e2e` đã được cấu hình cờ `--runInBand` trong `package.json` để tránh xung đột database khi Jest chạy song song.

```

---
```
