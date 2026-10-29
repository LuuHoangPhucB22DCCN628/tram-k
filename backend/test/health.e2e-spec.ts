import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";

describe("Health E2E", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health/live returns a success envelope", async () => {
    const response = await request(app.getHttpServer()).get("/health/live").expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(response.body.data.service).toBe("tram-k-api");
  });

  it("GET /health/ready returns ready when the database is up", async () => {
    const response = await request(app.getHttpServer()).get("/health/ready").expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ready");
    expect(response.body.data.database).toBe("connected");
  });
});
