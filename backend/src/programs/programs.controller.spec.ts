import { RoleName } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { ProgramsController } from "./programs.controller";
import { ProgramsService } from "./programs.service";

describe("ProgramsController", () => {
  const programs = {
    create: jest.fn(),
    submit: jest.fn(),
    review: jest.fn(),
  };
  const controller = new ProgramsController(programs as unknown as ProgramsService);
  const partner: AuthenticatedUser = {
    id: "user-1",
    role: RoleName.PARTNER,
    authVersion: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a program inside the success envelope", async () => {
    const dto = { title: "Chuong trinh ho tro" };
    programs.create.mockResolvedValue({ id: "program-1" });

    await expect(controller.create(partner, dto as never)).resolves.toEqual({
      success: true,
      data: { id: "program-1" },
    });
    expect(programs.create).toHaveBeenCalledWith(partner, dto);
  });

  it("submits a program inside the success envelope", async () => {
    programs.submit.mockResolvedValue({ id: "program-1", status: "PENDING" });

    await expect(controller.submit(partner, "program-1")).resolves.toEqual({
      success: true,
      data: { id: "program-1", status: "PENDING" },
    });
  });

  it("reviews a program inside the success envelope", async () => {
    const dto = { decision: "APPROVE" };
    programs.review.mockResolvedValue({ id: "program-1", status: "PUBLISHED" });

    await expect(controller.review(partner, "program-1", dto as never)).resolves.toEqual(
      {
        success: true,
        data: { id: "program-1", status: "PUBLISHED" },
      },
    );
  });
});
