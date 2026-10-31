import { RoleName } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { AuditLogsController } from "./audit-logs.controller";
import { AuditLogsService } from "./audit-logs.service";

describe("AuditLogsController", () => {
  const auditLogs = {
    list: jest.fn(),
  };
  const controller = new AuditLogsController(
    auditLogs as unknown as AuditLogsService,
  );
  const admin: AuthenticatedUser = {
    id: "admin-1",
    role: RoleName.ADMIN,
    authVersion: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists audit logs inside the success envelope", async () => {
    const query = { page: 1, limit: 20 };
    const data = { items: [{ id: "audit-1" }], total: 1, page: 1, limit: 20 };
    auditLogs.list.mockResolvedValue(data);

    await expect(controller.list(admin, query as never)).resolves.toEqual({
      success: true,
      data,
    });
    expect(auditLogs.list).toHaveBeenCalledWith(admin, query);
  });
});
