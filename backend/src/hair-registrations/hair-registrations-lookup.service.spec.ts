import { NotFoundException } from "@nestjs/common";
import { HairRegistrationMode, HairRegistrationStatus, RoleName } from "@prisma/client";

import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { HairRegistrationsService } from "./hair-registrations.service";

describe("HairRegistrationsService owner lookup", () => {
  const actor = { id: "member-1", role: RoleName.PATIENT, authVersion: 1 };
  const findFirst = jest.fn();
  const auditFindFirst = jest.fn();
  const prisma = {
    hairRegistration: { findFirst },
    auditLog: { findFirst: auditFindFirst },
  } as unknown as PrismaService;
  const service = new HairRegistrationsService(prisma, {} as NotificationsService);

  beforeEach(() => jest.clearAllMocks());

  it("looks up only a registration owned by the authenticated user", async () => {
    findFirst.mockResolvedValue({
      id: "hair-1",
      reference: "TK-20261017-ABCD1234",
      mode: HairRegistrationMode.RECEIVE,
      status: HairRegistrationStatus.APPROVED,
      createdAt: new Date("2026-10-17T01:00:00Z"),
      updatedAt: new Date("2026-10-17T02:00:00Z"),
    });

    await expect(service.lookupForOwner(actor, " tk-20261017-abcd1234 ")).resolves.toMatchObject({
      reference: "TK-20261017-ABCD1234",
      status: HairRegistrationStatus.APPROVED,
      rejectionReason: null,
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reference: "TK-20261017-ABCD1234", userId: actor.id },
      }),
    );
    expect(auditFindFirst).not.toHaveBeenCalled();
  });

  it("returns the same not-found response for another user's code or malformed code", async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.lookupForOwner(actor, "TK-20261017-ABCD1234")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: actor.id }) }),
    );

    findFirst.mockClear();
    await expect(service.lookupForOwner(actor, "not-a-code")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("includes the review reason only for the owner of a rejected registration", async () => {
    findFirst.mockResolvedValue({
      id: "hair-2",
      reference: "TK-20261017-ABCD5678",
      mode: HairRegistrationMode.DONATE,
      status: HairRegistrationStatus.REJECTED,
      createdAt: new Date("2026-10-17T01:00:00Z"),
      updatedAt: new Date("2026-10-17T02:00:00Z"),
    });
    auditFindFirst.mockResolvedValue({ reason: "Thông tin nơi hiến tóc chưa đầy đủ." });

    await expect(service.lookupForOwner(actor, "TK-20261017-ABCD5678")).resolves.toMatchObject({
      rejectionReason: "Thông tin nơi hiến tóc chưa đầy đủ.",
    });
    expect(auditFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entityId: "hair-2" }),
      }),
    );
  });
});
