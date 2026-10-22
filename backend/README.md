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

## 9. Chạy Integration Test (E2E) trên môi trường Local

Dự án sử dụng **Jest + Supertest** để chạy Integration Test trên PostgreSQL thật (đảm bảo các logic phức tạp như Ranking toàn cục hoạt động chính xác).

> ⚠️ **CẢNH BÁO:** Các bài test E2E (như Search) có thao tác xóa dữ liệu (truncate) để làm sạch môi trường. **Tuyệt đối không chạy E2E trên database Dev/Production.** Luôn sử dụng database Test riêng biệt.

### 9.1. Chuẩn bị Database Test

Mở PostgreSQL (pgAdmin/DBeaver) và tạo một database riêng:

```sql
CREATE DATABASE tramk_test_db;
```

### 9.2. Kích hoạt Extension (Quan trọng)

Logic tìm kiếm yêu cầu extension `pg_trgm` để chạy index Gin. Chạy lệnh sau trên database test:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 9.3. Cấu hình biến môi trường

Tạo file `.env.test` ở thư mục `backend/` (đã được ignore trong `.gitignore`):

```dotenv
DATABASE_URL="postgresql://postgres:password@localhost:5432/tramk_test_db?schema=public"
JWT_SECRET="tram-k-e2e-only-signing-secret-change-this"
```

### 9.4. Chạy Test

Chạy các lệnh sau tại thư mục `backend/`:

```powershell
# 1. Đồng bộ schema Prisma sang DB test
npx dotenv -e .env.test -- npx prisma db push

# 2. Chạy toàn bộ Integration Test
npm run test:e2e
```

## 10. Lỗi thường gặp

### Không kết nối được PostgreSQL

- Kiểm tra PostgreSQL đã chạy chưa.
- Kiểm tra `DATABASE_URL` trong `.env` hoặc `.env.test`.

### Không gửi được email xác minh

- Kiểm tra `EMAIL_DELIVERY_MODE`. Với `log`, xem log ở terminal. Với `smtp`/`webhook`, kiểm tra thông tin xác thực. Không chia sẻ mật khẩu khi nhờ hỗ trợ.

## 11. Quy tắc an toàn và làm việc nhóm

- Không commit `.env`, `.env.test`, mật khẩu database, khóa JWT.
- Tạo nhánh riêng cho từng mục tiêu.
- Trước khi mở pull request, chạy `npm test` và `npm run build`.

---
