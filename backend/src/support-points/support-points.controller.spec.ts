import { RoleName } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { SupportPointsController } from "./support-points.controller";
import { SupportPointsService } from "./support-points.service";

describe("SupportPointsController", () => {
  const service = {
    listPublicMap: jest.fn(),
    create: jest.fn(),
    submit: jest.fn(),
    review: jest.fn(),
  };
  const controller = new SupportPointsController(
    service as unknown as SupportPointsService,
  );
  const partner: AuthenticatedUser = {
    id: "user-1",
    role: RoleName.PARTNER,
    authVersion: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the public map inside the success envelope", async () => {
    service.listPublicMap.mockResolvedValue({ items: [{ id: "p1" }], total: 1 });

    await expect(controller.getMap("MEDICINE")).resolves.toEqual({
      success: true,
      data: { items: [{ id: "p1" }], total: 1 },
    });
    expect(service.listPublicMap).toHaveBeenCalledWith("MEDICINE");
  });

  it("creates a support point inside the success envelope", async () => {
    const dto = { name: "Nha thuoc An Tam" };
    service.create.mockResolvedValue({ id: "point-1" });

    await expect(controller.create(partner, dto as never)).resolves.toEqual({
      success: true,
      data: { id: "point-1" },
    });
    expect(service.create).toHaveBeenCalledWith(partner, dto);
  });

  it("reviews a support point inside the success envelope", async () => {
    service.review.mockResolvedValue({ id: "point-1", status: "PUBLISHED" });

    await expect(
      controller.review(partner, "point-1", { decision: "APPROVE" }),
    ).resolves.toEqual({
      success: true,
      data: { id: "point-1", status: "PUBLISHED" },
    });
    expect(service.review).toHaveBeenCalledWith(
      partner,
      "point-1",
      "APPROVE",
      undefined,
    );
  });
});
