import { Test, TestingModule } from "@nestjs/testing";
import { RoleName } from "@prisma/client";

import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { AuthenticatedUser } from "../auth/auth-user.interface";
// Thêm import AuthService (đường dẫn có thể thay đổi tùy cấu trúc thư mục của bạn)
import { AuthService } from "../auth/auth.service";

describe("DashboardController", () => {
  let controller: DashboardController;
  let service: DashboardService;

  const mockUser = { id: "admin-1", role: RoleName.ADMIN, authVersion: 1 } as AuthenticatedUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            getOverview: jest.fn(),
          },
        },
        // Thêm mock AuthService vào providers
        {
          provide: AuthService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    service = module.get<DashboardService>(DashboardService);
  });

  it("returns the overview inside the success envelope", async () => {
    const mockResult = { period: {}, current: {} };
    jest.spyOn(service, "getOverview").mockResolvedValue(mockResult as any);

    const result = await controller.getOverview(mockUser, { days: 7 });

    expect(service.getOverview).toHaveBeenCalledWith(mockUser, { days: 7 });
    expect(result).toEqual({ success: true, data: mockResult });
  });
});