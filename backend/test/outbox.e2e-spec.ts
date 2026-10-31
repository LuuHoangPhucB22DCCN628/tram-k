import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { NotificationKind, OutboxStatus, RoleName } from "@prisma/client";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { OutboxWorker } from "../src/outbox/outbox.worker";

describe("Outbox Worker E2E (Real PostgreSQL)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let worker: OutboxWorker;
    let testUserId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);
        worker = app.get<OutboxWorker>(OutboxWorker);

        // Dọn dẹp DB trước khi test
        await prisma.notification.deleteMany();
        await prisma.outboxEvent.deleteMany();
        await prisma.user.deleteMany(); // Xóa user cũ nếu có

        // 1. Tạo Role
        const role = await prisma.role.upsert({
            where: { name: RoleName.PATIENT },
            update: {},
            create: { name: RoleName.PATIENT },
        });

        // 2. Tạo User thật để thỏa mãn Foreign Key
        const user = await prisma.user.create({
            data: {
                email: "outbox-test@example.com",
                fullName: "Outbox Test User",
                passwordHash: "dummy-hash",
                roleId: role.id,
            },
        });
        testUserId = user.id; // Lưu lại ID để dùng trong test
    });

    afterAll(async () => {
        await prisma.notification.deleteMany();
        await prisma.outboxEvent.deleteMany();
        await prisma.user.deleteMany(); // Dọn dẹp user test
        await app.close();
    });

    it("phải xử lý event PROGRAM_REGISTRATION_SENT và tạo Notification", async () => {
        // 1. Tạo một event PENDING thủ công trong DB
        const event = await prisma.outboxEvent.create({
            data: {
                eventId: "test-event-001",
                type: "PROGRAM_REGISTRATION_SENT",
                aggregateType: "SupportProgramRegistration",
                aggregateId: "reg-123",
                status: OutboxStatus.PENDING,
                payload: {
                    recipientId: testUserId, // Dùng ID của user thật vừa tạo
                    programId: "prog-123",
                    programTitle: "Chương trình Test",
                    status: "CONFIRMED",
                    registrationVersion: 1,
                },
            },
        });

        // 2. Gọi trực tiếp hàm xử lý của Worker (thay vì đợi Cron 10 giây)
        await worker.processOutboxEvents();

        // 3. Kiểm tra Event đã được đánh dấu SENT
        const updatedEvent = await prisma.outboxEvent.findUnique({
            where: { id: event.id },
        });
        expect(updatedEvent?.status).toBe(OutboxStatus.SENT);

        // 4. Kiểm tra Notification đã thực sự được tạo ra
        const notification = await prisma.notification.findFirst({
            where: { recipientId: testUserId },
        });
        expect(notification).not.toBeNull();
        expect(notification?.kind).toBe(NotificationKind.PROGRAM_REGISTRATION_SENT);
        expect(notification?.dedupeKey).toContain("v1");
    });
});