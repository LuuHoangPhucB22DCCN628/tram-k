import { Test, TestingModule } from "@nestjs/testing";
import { ContentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ContentsScheduler } from "./contents.scheduler";

describe("ContentsScheduler", () => {
  let scheduler: ContentsScheduler;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      content: {
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentsScheduler, { provide: PrismaService, useValue: prisma }],
    }).compile();

    scheduler = module.get<ContentsScheduler>(ContentsScheduler);
    process.env.JOBS_ENABLED = "true";
  });

  it("publishes due content that still has a valid medical review", async () => {
    const futureDate = new Date(); futureDate.setDate(futureDate.getDate() + 1);
    prisma.content.findMany.mockResolvedValue([{
      id: "content-1",
      status: ContentStatus.SCHEDULED,
      nextReviewAt: futureDate
    }]);

    await scheduler.handleScheduledPublish();

    // SỬA: Dùng objectContaining để chấp nhận các điều kiện bổ sung trong where
    expect(prisma.content.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "content-1",
          status: ContentStatus.SCHEDULED,
          sourceId: { not: null },
          reviewedById: { not: null },
        }),
        data: expect.objectContaining({ status: ContentStatus.PUBLISHED }),
      })
    );
  });

  it("rolls content back to draft when the medical review has expired", async () => {
    const pastDate = new Date(); pastDate.setDate(pastDate.getDate() - 1);
    prisma.content.findMany.mockResolvedValue([{
      id: "content-1",
      status: ContentStatus.SCHEDULED,
      nextReviewAt: pastDate
    }]);

    // Vì CAS thất bại (nextReviewAt đã hết hạn) -> count = 0 -> chuyển về DRAFT
    prisma.content.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    await scheduler.handleScheduledPublish();

    // Lần gọi thứ 2 là updateMany chuyển về DRAFT
    expect(prisma.content.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          id: "content-1",
          status: ContentStatus.SCHEDULED
        }),
        data: expect.objectContaining({ status: ContentStatus.DRAFT }),
      })
    );
  });
});