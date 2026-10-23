import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import {
    ProgramStatus,
    SupportProgramRegistrationStatus,
    UserStatus,
    RoleName,
    PartnerStatus,
} from "@prisma/client";
import { JwtAuthGuard } from "../src/auth/jwt-auth.guard";

describe("Registration E2E (Concurrency & Idempotency)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let programId: string;
    let userId1: string;
    let userId2: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    // Giả lập user đăng nhập dựa trên header tùy chỉnh để test 2 user
                    const userId = req.headers["x-test-user-id"];
                    req.user = { id: userId, role: RoleName.PATIENT, authVersion: 1 };
                    return true;
                },
            })
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        prisma = app.get<PrismaService>(PrismaService);

        // 1. Dọn dẹp DB
        await prisma.supportProgramRegistration.deleteMany();
        await prisma.program.deleteMany();
        await prisma.partnerMembership.deleteMany();
        await prisma.user.deleteMany();

        // 2. Tạo Role
        const role = await prisma.role.upsert({
            where: { name: RoleName.PATIENT },
            update: {},
            create: { name: RoleName.PATIENT },
        });

        // 3. Tạo 2 Users
        const user1 = await prisma.user.create({
            data: {
                email: "test1@example.com",
                fullName: "Test User 1",
                passwordHash: "dummy",
                roleId: role.id,
                status: UserStatus.ACTIVE,
            },
        });
        userId1 = user1.id;

        const user2 = await prisma.user.create({
            data: {
                email: "test2@example.com",
                fullName: "Test User 2",
                passwordHash: "dummy",
                roleId: role.id,
                status: UserStatus.ACTIVE,
            },
        });
        userId2 = user2.id;

        // 4. Tạo PartnerMembership (Cần applicationId và grantedById)
        // Tạo một application giả cho user1 để có applicationId
        const admin = await prisma.user.create({
            data: {
                email: "admin@example.com",
                fullName: "Admin",
                passwordHash: "dummy",
                roleId: (await prisma.role.upsert({ where: { name: RoleName.ADMIN }, update: {}, create: { name: RoleName.ADMIN } })).id,
                status: UserStatus.ACTIVE,
            }
        });

        const application = await prisma.partnerApplication.create({
            data: {
                applicantId: user1.id,
                organizationName: "Test Org",
                representativeName: "Test Rep",
                phone: "0123456789",
                email: "test1@example.com",
                address: "Test Address",
                introduction: "Test Intro",
                status: "APPROVED",
            }
        });

        const partner = await prisma.partnerMembership.create({
            data: {
                userId: user1.id,
                applicationId: application.id,
                grantedById: admin.id,
                grantedAt: new Date(),
                status: PartnerStatus.ACTIVE,
            },
        });

        // 5. Tạo Program capacity = 1
        const program = await prisma.program.create({
            data: {
                ownerPartnerId: partner.id,
                title: "Chương trình tranh chấp slot",
                description: "Test",
                address: "Test",
                latitude: 0,
                longitude: 0,
                registrationOpenAt: new Date(Date.now() - 10000),
                registrationCloseAt: new Date(Date.now() + 10000),
                startAt: new Date(Date.now() + 20000),
                endAt: new Date(Date.now() + 30000),
                capacity: 1, // Chỉ có 1 chỗ
                status: ProgramStatus.PUBLISHED,
            },
        });
        programId = program.id;
    });

    afterAll(async () => {
        await prisma.supportProgramRegistration.deleteMany();
        await prisma.program.deleteMany();
        await prisma.partnerMembership.deleteMany();
        await prisma.partnerApplication.deleteMany();
        await prisma.user.deleteMany();
        await app.close();
    });

    it("phải chống bấm 2 lần (Idempotency) tạo ra 2 đăng ký", async () => {
        const idempotencyKey = `idem-key-${Date.now()}`;

        // 1. Gửi request lần 1 (Dùng await để đợi nó lưu DB xong hoàn toàn)
        const res1 = await request(app.getHttpServer())
            .post(`/programs/${programId}/registrations`)
            .set("x-test-user-id", userId1)
            .set("x-idempotency-key", idempotencyKey)
            .send({});

        // 2. Gửi request lần 2 (Sau khi request 1 đã xong)
        const res2 = await request(app.getHttpServer())
            .post(`/programs/${programId}/registrations`)
            .set("x-test-user-id", userId1)
            .set("x-idempotency-key", idempotencyKey)
            .send({});

        console.log("RES1:", res1.status, res1.body);
        console.log("RES2:", res2.status, res2.body);
        // Kỳ vọng: Cả 2 đều thành công (201) và trả về cùng kết quả
        expect(res1.status).toBe(201);
        expect(res2.status).toBe(201);

        // CHỨNG MINH: Database chỉ có 1 Registration duy nhất
        const count = await prisma.supportProgramRegistration.count({
            where: { programId, userId: userId1 },
        });
        expect(count).toBe(1);
    });

    it("phải xử lý tranh chấp slot cuối (Concurrency) - Chỉ 1 người CONFIRMED", async () => {
        // Xóa đăng ký cũ để test tranh chấp
        await prisma.supportProgramRegistration.deleteMany({ where: { programId } });

        // 2 user gửi request cùng lúc, không dùng idempotency key
        const [res1, res2] = await Promise.all([
            request(app.getHttpServer())
                .post(`/programs/${programId}/registrations`)
                .set("x-test-user-id", userId1)
                .send({}),
            request(app.getHttpServer())
                .post(`/programs/${programId}/registrations`)
                .set("x-test-user-id", userId2)
                .send({}),
        ]);

        // Cả 2 request đều phải thành công (không bị lỗi 500)
        expect(res1.status).toBe(201);
        expect(res2.status).toBe(201);

        const confirmedCount = await prisma.supportProgramRegistration.count({
            where: { programId, status: SupportProgramRegistrationStatus.CONFIRMED },
        });
        const waitlistedCount = await prisma.supportProgramRegistration.count({
            where: { programId, status: SupportProgramRegistrationStatus.WAITLISTED },
        });

        // CHỨNG MINH: Chỉ 1 CONFIRMED, 1 WAITLISTED
        expect(confirmedCount).toBe(1);
        expect(waitlistedCount).toBe(1);
    });
});