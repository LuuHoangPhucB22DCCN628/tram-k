import { ConflictException } from "@nestjs/common";
import { IdempotencyStatus, Prisma } from "@prisma/client";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { IdempotencyService } from "./idempotency.service";

describe("IdempotencyService", () => {
  let service: IdempotencyService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      idempotencyRecord: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  it("phải claim thành công nếu chưa có key", async () => {
    prisma.idempotencyRecord.findUnique.mockResolvedValue(null);
    prisma.idempotencyRecord.create.mockResolvedValue({ id: "1", status: IdempotencyStatus.PROCESSING });

    const result = await service.claim("user:1", "OP", "key-1", "hash-a");
    // SỬA: Code mới trả về object thay vì null
    expect(result).toEqual({ id: "1", status: IdempotencyStatus.PROCESSING });
  });

  it("phải ném ConflictException nếu đang PROCESSING", async () => {
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      id: "1", payloadHash: "hash-a", status: IdempotencyStatus.PROCESSING,
      createdAt: new Date(), expiresAt: new Date(Date.now() + 10000)
    });
    await expect(service.claim("user:1", "OP", "key-1", "hash-a")).rejects.toBeInstanceOf(ConflictException);
  });

  it("phải trả về kết quả cũ nếu đã COMPLETED", async () => {
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      id: "1", payloadHash: "hash-a", status: IdempotencyStatus.COMPLETED, responseBody: { id: "1" },
      expiresAt: new Date(Date.now() + 10000)
    });
    const result = await service.claim("user:1", "OP", "key-1", "hash-a");
    expect(result!.status).toBe(IdempotencyStatus.COMPLETED);
  });

  it("phải ném ConflictException nếu payload khác", async () => {
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      id: "1", payloadHash: "hash-a", status: IdempotencyStatus.COMPLETED,
      expiresAt: new Date(Date.now() + 10000)
    });
    await expect(service.claim("user:1", "OP", "key-1", "hash-b")).rejects.toBeInstanceOf(ConflictException);
  });
});