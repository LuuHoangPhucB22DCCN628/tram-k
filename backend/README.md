# Tram K Backend

Backend REST API cua du an Tram K, phat trien bang NestJS, Prisma va PostgreSQL.

## Yeu cau

- Node.js 20.11 tro len (may nhom hien dung Node.js 22.14.0).
- npm 10 tro len.
- PostgreSQL 15 tro len.

## Cai dat tren may moi

1. Mo terminal tai thu muc `backend`.
2. Chay `npm install`.
3. Sao chep `.env.example` thanh `.env`.
4. Sua `DATABASE_URL` va `SEED_ADMIN_PASSWORD` trong `.env`.
5. Tao database PostgreSQL ten `tram_k`.
6. Chay `npm run db:generate`.
7. Chay `npm run db:deploy` de ap dung migration.
8. Chay `npm run db:seed` de tao 3 vai tro va tai khoan admin.
9. Chay `npm run start:dev`.

## Dia chi sau khi khoi dong

- Health check: `http://localhost:3000/health`
- Swagger: `http://localhost:3000/docs`
- Frontend Angular duoc phep goi API mac dinh: `http://localhost:4200`

## Lenh thuong dung

- `npm run start:dev`: chay Backend va tu tai lai khi sua code.
- `npm run build`: build ban production.
- `npm test`: chay unit test.
- `npm run test:e2e`: chay test API.
- `npm run db:generate`: tao Prisma Client tu schema.
- `npm run db:migrate -- --name ten_migration`: tao migration moi khi sua schema.
- `npm run db:deploy`: ap dung migration da co.
- `npm run db:seed`: tao du lieu khoi tao.
- `npm run db:studio`: mo giao dien xem database.

## Cau truc thu muc

```text
src/
  common/      Kieu response va bo xu ly loi dung chung
  config/      Kiem tra bien moi truong
  health/      API kiem tra Backend
  prisma/      Ket noi Prisma voi cac module NestJS
prisma/
  migrations/  Lich su thay doi cau truc PostgreSQL
  schema.prisma Mo hinh du lieu
  seed.ts       Du lieu vai tro va tai khoan admin ban dau
```

## Quy uoc API

Response thanh cong:

```json
{
  "success": true,
  "data": {}
}
```

Response loi:

```json
{
  "success": false,
  "error": {
    "code": "HTTP_400",
    "message": "Noi dung loi"
  },
  "timestamp": "2026-09-04T00:00:00.000Z",
  "path": "/duong-dan"
}
```

## Luu y an toan

- Khong commit file `.env`.
- Khong dung mat khau mau khi demo hoac deploy.
- Frontend khong truy cap PostgreSQL truc tiep; moi du lieu di qua REST API.
- Backend phai validate du lieu va kiem tra quyen o moi API can bao ve.
