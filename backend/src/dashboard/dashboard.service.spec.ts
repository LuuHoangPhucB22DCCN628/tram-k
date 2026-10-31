import { Test, TestingModule } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ForbiddenException } from "@nestjs/common";
import { RoleName, UserStatus } from "@prisma/client";

import { DashboardService } from "./dashboard.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/auth-user.interface";

describe("DashboardService", () => {
  let service: DashboardService;
  let prisma: any;
  let cacheManager: any;

  const mockUser = { id: "admin-1", role: RoleName.ADMIN, authVersion: 1 } as AuthenticatedUser;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "admin-1",
          status: UserStatus.ACTIVE,
          deletedAt: null,
          role: { name: RoleName.ADMIN }
        }),
        count: jest.fn()
      },
      authAttempt: { groupBy: jest.fn() },
      registrationStatusHistory: { groupBy: jest.fn() },
      post: { count: jest.fn() },
      report: { count: jest.fn() },
      partnerApplication: { count: jest.fn() },
      program: { count: jest.fn() },
      supportProgramRegistration: { count: jest.fn() },
    };
    cacheManager = { get: jest.fn(), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it("phải trả về dữ liệu từ cache nếu có", async () => {
    const cached = { period: {}, current: {} };
    cacheManager.get.mockResolvedValue(cached);

    await expect(service.getOverview(mockUser, { days: 7 })).resolves.toBe(cached);
  });

  it("phải tính toán và lưu cache nếu chưa có", async () => {
    cacheManager.get.mockResolvedValue(null);

    // Mock return values cho tất cả các query
    prisma.authAttempt.groupBy.mockResolvedValue([{ userId: "1" }]);
    prisma.user.count.mockResolvedValue(5);
    prisma.registrationStatusHistory.groupBy.mockResolvedValue([{ registrationId: "r1" }]);
    prisma.post.count.mockResolvedValue(2);
    prisma.report.count.mockResolvedValue(1);
    prisma.partnerApplication.count.mockResolvedValue(3);
    prisma.program.count.mockResolvedValue(4);
    prisma.supportProgramRegistration.count.mockResolvedValue(5);

    const result: any = await service.getOverview(mockUser, { days: 7 });

    expect(result.period.activeUsers).toBe(1);
    expect(result.period.newUsers).toBe(5);
    expect(result.current.pendingPosts).toBe(2);
    expect(cacheManager.set).toHaveBeenCalled();
  });

  it("phải ném lỗi ForbiddenException nếu không phải Admin", async () => {
    // Mock user không phải Admin
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PATIENT }
    });

    await expect(service.getOverview({ id: "user-1" } as any, { days: 7 })).rejects.toBeInstanceOf(ForbiddenException);
  });
});