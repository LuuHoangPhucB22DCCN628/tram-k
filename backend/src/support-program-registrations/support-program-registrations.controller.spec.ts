import { RoleName } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { SupportProgramRegistrationsController } from "./support-program-registrations.controller";
import { SupportProgramRegistrationsService } from "./support-program-registrations.service";

describe("SupportProgramRegistrationsController", () => {
  const registrations = {
    mine: jest.fn(),
    forProgram: jest.fn(),
    register: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
  };
  const controller = new SupportProgramRegistrationsController(
    registrations as unknown as SupportProgramRegistrationsService,
  );
  const user: AuthenticatedUser = {
    id: "user-1",
    role: RoleName.PATIENT,
    authVersion: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists the current user's registrations inside the success envelope", async () => {
    registrations.mine.mockResolvedValue([{ id: "reg-1" }]);

    await expect(controller.mine(user)).resolves.toEqual({
      success: true,
      data: [{ id: "reg-1" }],
    });
  });

  it("registers a member inside the success envelope", async () => {
    registrations.register.mockResolvedValue({ id: "reg-1", status: "CONFIRMED" });

    await expect(controller.register(user, "program-1")).resolves.toEqual({
      success: true,
      data: { id: "reg-1", status: "CONFIRMED" },
    });
    expect(registrations.register).toHaveBeenCalledWith(user, "program-1");
  });

  it("cancels a registration inside the success envelope", async () => {
    registrations.cancel.mockResolvedValue({ id: "reg-1", status: "CANCELLED" });

    await expect(controller.cancel(user, "program-1")).resolves.toEqual({
      success: true,
      data: { id: "reg-1", status: "CANCELLED" },
    });
  });
});
