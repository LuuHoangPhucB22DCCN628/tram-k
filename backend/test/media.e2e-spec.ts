import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ExecutionContext } from "@nestjs/common"; // Thêm ExecutionContext
import request from "supertest";
import { AppModule } from "../src/app.module";
import { JwtAuthGuard } from "../src/auth/jwt-auth.guard";

describe("Media E2E", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                // Thêm type ExecutionContext cho context
                canActivate: (context: ExecutionContext) => {
                    const req = context.switchToHttp().getRequest();
                    req.user = { id: "test-admin-id", role: "ADMIN" };
                    return true;
                },
            })
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it("phải chặn file giả mạo Magic Bytes (đuôi .jpg nhưng ruột là .txt)", async () => {
        const fakeImageBuffer = Buffer.from("Đây là mã độc chứ không phải ảnh!");

        await request(app.getHttpServer())
            .post("/media/upload?kind=avatar")
            .attach("file", fakeImageBuffer, "hacked.jpg")
            .expect(400);
    });
});