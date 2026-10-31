import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";

describe("Public CMS contents E2E", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /contents/public returns a success envelope without PODCAST type", async () => {
    const response = await request(app.getHttpServer())
      .get("/contents/public")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
      }),
    );
    const items = response.body.data.items as Array<{ type?: string }>;
    expect(items.every((item) => item.type !== "PODCAST")).toBe(true);
  });
});
