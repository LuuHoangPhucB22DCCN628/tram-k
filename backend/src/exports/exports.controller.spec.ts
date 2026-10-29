import { StreamableFile } from "@nestjs/common";
import { RoleName } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { ExportsController } from "./exports.controller";
import { ExportsService } from "./exports.service";

describe("ExportsController", () => {
  const exports = {
    exportProgramRegistrations: jest.fn(),
  };
  const controller = new ExportsController(exports as unknown as ExportsService);
  const admin: AuthenticatedUser = {
    id: "admin-1",
    role: RoleName.ADMIN,
    authVersion: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("streams the CSV attachment from the export service", async () => {
    const buffer = Buffer.from("\uFEFFname,email\nAn,an@example.com\n", "utf-8");
    exports.exportProgramRegistrations.mockResolvedValue({
      buffer,
      fileName: "Chuong-trinh.csv",
    });

    const result = await controller.exportRegistrations(admin, "program-1");

    expect(result).toBeInstanceOf(StreamableFile);
    expect(exports.exportProgramRegistrations).toHaveBeenCalledWith(
      admin,
      "program-1",
    );
  });
});
