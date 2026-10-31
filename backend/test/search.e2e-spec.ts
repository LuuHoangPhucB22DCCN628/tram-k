import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { SearchDocumentType } from "@prisma/client";

describe("Search E2E (Real PostgreSQL)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        prisma = app.get<PrismaService>(PrismaService);

        // Xóa sạch bảng trước khi test
        await prisma.searchDocument.deleteMany();
    });

    afterAll(async () => {
        await prisma.searchDocument.deleteMany();
        await app.close();
    });

    it("phải trả về bài có ranking cao nhất trước cả khi phân trang", async () => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Tạo 2 bản ghi: Bài A khớp title 100%, Bài B chỉ khớp text nhưng mới hơn
        await prisma.searchDocument.createMany({
            data: [
                {
                    sourceId: "doc-A", type: SearchDocumentType.GUIDE, title: "Ung thư",
                    normalizedTitle: "ung thu", normalizedText: "ung thu",
                    publishedAt: yesterday, active: true, link: "/a", description: "", eyebrow: "", metadata: ""
                },
                {
                    sourceId: "doc-B", type: SearchDocumentType.GUIDE, title: "Bài viết mới",
                    normalizedTitle: "bai viet moi", normalizedText: "bai viet moi ve benh ung thu",
                    publishedAt: now, active: true, link: "/b", description: "", eyebrow: "", metadata: ""
                },
            ],
        });

        // Gọi API với pageSize=1. Nếu Ranking sai, nó sẽ trả về doc-B (do publishedAt mới hơn)
        const response = await request(app.getHttpServer())
            .get("/search?q=ung%20thu&pageSize=1&page=1")
            .expect(200);

        expect(response.body.data.items[0].id).toBe("doc-A"); // Phải là doc-A
    });
});