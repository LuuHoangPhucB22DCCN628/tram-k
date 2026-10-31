import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { PartnerStatus, RoleName, UserStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { PrismaService } from "../prisma/prisma.service";
import { ExportsService } from "./exports.service";

describe("ExportsService", () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    program: { findUnique: jest.fn() },
    supportProgramRegistration: { findMany: jest.fn() },
    auditLog: { create: jest.fn() },
  } as unknown as PrismaService;

  const service = new ExportsService(prisma);
  const admin: AuthenticatedUser = {
    id: "admin-1",
    role: RoleName.ADMIN,
    authVersion: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "admin-1",
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.ADMIN },
      partnerMembership: null,
    });
    (prisma.program.findUnique as jest.Mock).mockResolvedValue({
      id: "program-1",
      title: "Chuong trinh ho tro",
      ownerPartnerId: "partner-1",
    });
    (prisma.supportProgramRegistration.findMany as jest.Mock).mockResolvedValue([
      {
        applicantName: "=CMD|' /C calc'!A0",
        applicantEmail: "an@example.com",
        status: "CONFIRMED",
        registeredAt: new Date("2026-10-01T00:00:00.000Z"),
        confirmedAt: new Date("2026-10-02T00:00:00.000Z"),
        decisionReason: "+1-555-0007",
      },
    ]);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it("exports registrations with UTF-8 BOM and CSV injection sanitization", async () => {
    const result = await service.exportProgramRegistrations(admin, "program-1");

    expect(result.buffer.subarray(0, 3).equals(Buffer.from("\uFEFF", "utf-8"))).toBe(
      true,
    );
    const csv = result.buffer.toString("utf-8");
    expect(csv).toContain("'=CMD|' /C calc'!A0");
    expect(csv).toContain("'+1-555-0007");
    expect(csv).not.toMatch(/(?:^|,)=CMD/m);
    expect(result.fileName).toContain("Chuong-trinh-ho-tro");
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "EXPORT_CSV_REGISTRATIONS" }),
    });
  });

  it("forbids a non-owner member from exporting", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PATIENT },
      partnerMembership: { id: "partner-other", status: PartnerStatus.ACTIVE },
    });

    await expect(
      service.exportProgramRegistrations(
        { id: "user-1", role: RoleName.PATIENT, authVersion: 1 },
        "program-1",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows the owning active partner to export", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleName.PARTNER },
      partnerMembership: { id: "partner-1", status: PartnerStatus.ACTIVE },
    });

    await expect(
      service.exportProgramRegistrations(
        { id: "user-1", role: RoleName.PARTNER, authVersion: 1 },
        "program-1",
      ),
    ).resolves.toEqual(expect.objectContaining({ fileName: expect.any(String) }));
  });

  it("rejects export when the program has no registrations", async () => {
    (prisma.supportProgramRegistration.findMany as jest.Mock).mockResolvedValue([]);

    await expect(
      service.exportProgramRegistrations(admin, "program-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects export of a missing program", async () => {
    (prisma.program.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.exportProgramRegistrations(admin, "missing"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
