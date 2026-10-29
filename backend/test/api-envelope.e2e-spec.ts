import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";

describe("API envelope E2E", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns the error envelope for an unknown route", async () => {
    const response = await request(app.getHttpServer())
      .get("/no-such-route")
      .set("x-correlation-id", "corr-e2e-1")
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toEqual(expect.any(String));
    expect(response.body.error.message).toEqual(expect.anything());
    expect(response.body.path).toBe("/no-such-route");
    expect(response.body.correlationId).toBe("corr-e2e-1");
    expect(response.body.timestamp).toMatch(/Z$/);
  });

  it("returns the error envelope for a validation failure", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(response.body.error.message)).toBe(true);
  });
});
