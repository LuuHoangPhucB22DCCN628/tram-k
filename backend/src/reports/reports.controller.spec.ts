import { RoleName } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

describe("ReportsController", () => {
  const reports = {
    create: jest.fn(),
    review: jest.fn(),
  };
  const controller = new ReportsController(reports as unknown as ReportsService);
  const user: AuthenticatedUser = {
    id: "user-1",
    role: RoleName.PATIENT,
    authVersion: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a report inside the success envelope", async () => {
    const dto = { targetType: "POST", targetId: "post-1", reason: "spam" };
    reports.create.mockResolvedValue({ id: "report-1" });

    await expect(controller.create(user, dto as never)).resolves.toEqual({
      success: true,
      data: { id: "report-1" },
    });
    expect(reports.create).toHaveBeenCalledWith(user.id, dto);
  });

  it("reviews a report inside the success envelope", async () => {
    const dto = { decision: "RESOLVE" };
    reports.review.mockResolvedValue({ id: "report-1", status: "RESOLVED" });

    await expect(controller.review(user, "report-1", dto as never)).resolves.toEqual({
      success: true,
      data: { id: "report-1", status: "RESOLVED" },
    });
    expect(reports.review).toHaveBeenCalledWith(user.id, "report-1", dto);
  });
});
