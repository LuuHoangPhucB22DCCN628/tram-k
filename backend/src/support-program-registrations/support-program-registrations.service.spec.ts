import { ManagedResourceStatus, RoleName, UserStatus } from "@prisma/client";

import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SupportProgramRegistrationsService } from "./support-program-registrations.service";

describe("SupportProgramRegistrationsService schedule", () => {
  it("rejects a registration after a one-time program ends", async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({
        id: "patient-1", status: UserStatus.ACTIVE, deletedAt: null,
        role: { name: RoleName.PATIENT },
      }) },
      managedResource: { findUnique: jest.fn().mockResolvedValue({
        title: "Bữa cơm yêu thương", status: ManagedResourceStatus.PUBLISHED,
        payload: {
          ownerId: "partner-1", capacity: 20,
          scheduleType: "ONE_TIME", startsOn: "2020-01-01", startTime: "09:00", endTime: "11:00",
        },
      }) },
      $transaction: jest.fn(),
    };
    const service = new SupportProgramRegistrationsService(
      prisma as unknown as PrismaService,
      {} as NotificationsService,
    );

    await expect(service.register({ id: "patient-1", role: RoleName.PATIENT, authVersion: 1 }, "program-1"))
      .rejects.toThrow("đã kết thúc");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a legacy program without a dated schedule", async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({
        id: "patient-1", status: UserStatus.ACTIVE, deletedAt: null,
        role: { name: RoleName.PATIENT },
      }) },
      managedResource: { findUnique: jest.fn().mockResolvedValue({
        status: ManagedResourceStatus.PUBLISHED,
        payload: { ownerId: "partner-1", capacity: 20, schedule: "Thứ Hai" },
      }) },
      $transaction: jest.fn(),
    };
    const service = new SupportProgramRegistrationsService(
      prisma as unknown as PrismaService, {} as NotificationsService,
    );
    await expect(service.register({ id: "patient-1", role: RoleName.PATIENT, authVersion: 1 }, "legacy"))
      .rejects.toThrow("chưa có lịch ngày giờ hợp lệ");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
