import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ModerationTargetType, ReportStatus, RoleName } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ReportDecision } from "./dto/review-report.dto";
import { ReportsService } from "./reports.service";

describe("ReportsService", () => {
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof prisma) => unknown) =>
      callback(prisma),
    ),
    user: { findUnique: jest.fn() },
    report: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  } as unknown as PrismaService;

  const service = new ReportsService(prisma);
  const dto = {
    targetType: ModerationTargetType.POST,
    targetId: "post-1",
    reasonCode: "SPAM",
    details: "Quảng cáo",
    idempotencyKey: "report-key-0001",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.report.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.report.create as jest.Mock).mockResolvedValue({
      id: "report-1",
      status: ReportStatus.OPEN,
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it("creates an open report with audit in the same transaction", async () => {
    const report = await service.create("user-1", dto);
    expect(report.status).toBe(ReportStatus.OPEN);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CREATE_REPORT",
        entityType: "REPORT",
      }),
    });
  });

  it("rejects a duplicate open report for the same target", async () => {
    (prisma.report.findFirst as jest.Mock).mockResolvedValue({ id: "report-1" });

    await expect(service.create("user-1", dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("resolves an open report as admin", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "admin-1",
      role: { name: RoleName.ADMIN },
    });
    (prisma.report.findUnique as jest.Mock).mockResolvedValue({
      id: "report-1",
      status: ReportStatus.OPEN,
    });
    (prisma.report.update as jest.Mock).mockResolvedValue({
      id: "report-1",
      status: ReportStatus.RESOLVED,
    });

    const updated = await service.review("admin-1", "report-1", {
      decision: ReportDecision.RESOLVE,
      reason: "Đã ẩn nội dung vi phạm.",
    });
    expect(updated.status).toBe(ReportStatus.RESOLVED);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "RESOLVE_REPORT" }),
    });
  });

  it("returns 404 when the report is missing", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "admin-1",
      role: { name: RoleName.ADMIN },
    });
    (prisma.report.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.review("admin-1", "missing", {
        decision: ReportDecision.DISMISS,
        reason: "Không đủ căn cứ xử lý.",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects reviewing an already processed report", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "admin-1",
      role: { name: RoleName.ADMIN },
    });
    (prisma.report.findUnique as jest.Mock).mockResolvedValue({
      id: "report-1",
      status: ReportStatus.RESOLVED,
    });

    await expect(
      service.review("admin-1", "report-1", {
        decision: ReportDecision.DISMISS,
        reason: "Không đủ căn cứ xử lý.",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("forbids a non-admin from reviewing reports", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      role: { name: RoleName.PATIENT },
    });

    await expect(
      service.review("user-1", "report-1", {
        decision: ReportDecision.RESOLVE,
        reason: "Đã ẩn nội dung vi phạm.",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
