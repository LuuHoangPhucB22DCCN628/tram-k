# Trạm K

Ứng dụng gồm hai phần chạy riêng và một gói dữ liệu dùng chung:

- `frontend/`: Angular.
- `backend/`: NestJS, Prisma và PostgreSQL.
- `shared/support-data/`: dữ liệu tỉnh và điểm tiếp nhận mặc định dùng chung cho frontend/backend.

Khi cài đặt hoặc triển khai riêng frontend/backend, vẫn cần giữ thư mục `shared/support-data/` cùng cấp để `npm ci` cài được package nội bộ.

## Yêu cầu môi trường

- Git.
- Node.js 22 và npm.
- PostgreSQL đang chạy và có một database dành cho dự án.

Không commit file `.env`, khóa API, mật khẩu database, `node_modules/` hoặc thư mục `dist/`.

## Clone và khởi động

```powershell
git clone https://github.com/LuuHoangPhucB22DCCN628/tram-k.git
cd tram-k
```

### Backend

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Sửa `backend/.env`, ít nhất là `DATABASE_URL`, `JWT_SECRET`,
`OUTBOX_ENCRYPTION_KEY` và `IP_HASH_SECRET`. Dùng giá trị riêng cho máy cá nhân,
không gửi các giá trị này lên Git.

Sau đó tạo Prisma Client, áp dụng migration và chạy API:

```powershell
npm run prisma:generate
npm run db:migrate
npm run start:dev
```

API mặc định chạy tại `http://localhost:3000`; kiểm tra bằng
`http://localhost:3000/health`.

Nếu muốn dùng script quản lý PostgreSQL kèm theo repo, đặt các biến môi trường
`TRAM_K_POSTGRES_ROOT`, `TRAM_K_POSTGRES_DATA`, `TRAM_K_POSTGRES_LOGS` theo vị trí
cài đặt trên máy rồi chạy `npm run db:start`.

### Frontend

Mở terminal khác từ thư mục gốc:

```powershell
cd frontend
npm ci
npm start
```

Frontend mặc định chạy tại `http://localhost:4200` và gọi API ở cổng 3000.

## Kiểm thử trước khi mở pull request

Backend:

```powershell
cd backend
npx prisma validate
npx prisma migrate status
npm test
npm run build
```

Frontend:

```powershell
cd frontend
npm run format:check
npm run test:ci
npm run build
```

## Quy trình làm việc để dễ review

1. Cập nhật `main`: `git switch main` rồi `git pull --ff-only origin main`.
2. Tạo nhánh theo một mục tiêu, ví dụ `feature/backend-profile-api`.
3. Chia commit theo phạm vi chức năng; không trộn format, refactor và tính năng
   không liên quan trong cùng commit.
4. Chạy các lệnh kiểm thử ở trên.
5. Push nhánh và mở pull request; ghi rõ phạm vi, cách kiểm thử, migration mới và
   việc còn lại.
6. Chỉ merge khi CI xanh và người review đã duyệt.

Các phần tích hợp cố ý để sau được ghi trong
[`docs/deferred-work.md`](docs/deferred-work.md).
