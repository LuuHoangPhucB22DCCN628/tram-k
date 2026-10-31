import { RoleName, SearchDocumentType } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { ContentsController } from "./contents.controller";
import { ContentsService } from "./contents.service";

describe("ContentsController", () => {
  const contents = {
    listPublic: jest.fn(),
    create: jest.fn(),
    publish: jest.fn(),
  };
  const controller = new ContentsController(contents as unknown as ContentsService);
  const admin: AuthenticatedUser = {
    id: "admin-1",
    role: RoleName.ADMIN,
    authVersion: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists public CMS content inside the success envelope", async () => {
    contents.listPublic.mockResolvedValue({ items: [], total: 0 });

    await expect(
      controller.listPublic(SearchDocumentType.GUIDE, 1, 12),
    ).resolves.toEqual({
      success: true,
      data: { items: [], total: 0 },
    });
    expect(contents.listPublic).toHaveBeenCalledWith(
      SearchDocumentType.GUIDE,
      1,
      12,
    );
  });

  it("creates CMS content inside the success envelope", async () => {
    const dto = { title: "Huong dan" };
    contents.create.mockResolvedValue({ id: "content-1" });

    await expect(controller.create(admin, dto as never)).resolves.toEqual({
      success: true,
      data: { id: "content-1" },
    });
  });

  it("publishes CMS content inside the success envelope", async () => {
    const dto = { medicalReviewedUntil: "2027-01-01T00:00:00.000Z" };
    contents.publish.mockResolvedValue({ id: "content-1", status: "PUBLISHED" });

    await expect(controller.publish(admin, "content-1", dto as never)).resolves.toEqual(
      {
        success: true,
        data: { id: "content-1", status: "PUBLISHED" },
      },
    );
  });
});
