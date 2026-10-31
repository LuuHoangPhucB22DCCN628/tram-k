import { RoleName } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { PartnerApplicationDocumentsService } from "./partner-application-documents.service";
import { PartnerApplicationsController } from "./partner-applications.controller";
import { PartnerApplicationsService } from "./partner-applications.service";

describe("PartnerApplicationsController", () => {
  const applications = {
    findMine: jest.fn(),
    saveDraft: jest.fn(),
    submit: jest.fn(),
    listForAdmin: jest.fn(),
    review: jest.fn(),
    changePartnerStatus: jest.fn(),
  };
  const documents = {
    store: jest.fn(),
    load: jest.fn(),
  };
  const controller = new PartnerApplicationsController(
    applications as unknown as PartnerApplicationsService,
    documents as unknown as PartnerApplicationDocumentsService,
  );
  const user: AuthenticatedUser = {
    id: "user-1",
    role: RoleName.PATIENT,
    authVersion: 1,
  };
  const admin: AuthenticatedUser = {
    id: "admin-1",
    role: RoleName.ADMIN,
    authVersion: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the current application inside the success envelope", async () => {
    applications.findMine.mockResolvedValue({
      status: "DRAFT",
      trackingCode: null,
    });

    await expect(controller.mine(user)).resolves.toEqual({
      success: true,
      data: { status: "DRAFT", trackingCode: null },
    });
  });

  it("saves a DRAFT application inside the success envelope", async () => {
    const dto = { organizationName: "Nhom An Tam" };
    applications.saveDraft.mockResolvedValue({
      status: "DRAFT",
      organizationName: dto.organizationName,
    });

    await expect(controller.saveDraft(user, dto as never)).resolves.toEqual({
      success: true,
      data: { status: "DRAFT", organizationName: dto.organizationName },
    });
    expect(applications.saveDraft).toHaveBeenCalledWith(user.id, dto);
  });

  it("submits then reloads the application with trackingCode", async () => {
    const dto = { organizationName: "Nhom An Tam" };
    applications.submit.mockResolvedValue(undefined);
    applications.findMine.mockResolvedValue({
      status: "PENDING",
      trackingCode: "TK-20261029-ABCDEF",
    });

    await expect(controller.submit(user, dto as never)).resolves.toEqual({
      success: true,
      data: { status: "PENDING", trackingCode: "TK-20261029-ABCDEF" },
    });
    expect(applications.submit).toHaveBeenCalledWith(user.id, dto);
  });

  it("lists admin applications inside the success envelope", async () => {
    const query = { status: "PENDING", page: 1, limit: 20 };
    applications.listForAdmin.mockResolvedValue({ items: [], total: 0 });

    await expect(controller.listForAdmin(admin, query as never)).resolves.toEqual(
      {
        success: true,
        data: { items: [], total: 0 },
      },
    );
    expect(applications.listForAdmin).toHaveBeenCalledWith(
      admin.id,
      "PENDING",
      1,
      20,
    );
  });
});
