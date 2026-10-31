import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { ProfileVisibility, RoleName, UserStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ProfilesService } from "./profiles.service";

const user = {
  id: "user-1",
  email: "member@example.com",
  fullName: "Nguyễn An",
  deletedAt: null,
  role: { name: RoleName.PATIENT },
  profile: null,
};

const update = {
  expectedVersion: 1,
  displayName: "Nguyễn An mới",
  phone: "0912345678",
  city: "Hà Nội",
  birthYear: 1994,
  bio: "Thành viên Trạm K",
  avatarDataUrl: null,
  visibility: ProfileVisibility.MEMBERS,
  showEmail: false,
  allowComments: true,
};

describe("ProfilesService", () => {
  const transaction = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };
  const prismaMock = {
    user: { findFirst: jest.fn() },
    $transaction: jest.fn(
      (operation: (client: typeof transaction) => unknown) =>
        operation(transaction),
    ),
  };
  const service = new ProfilesService(prismaMock as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.user.findFirst.mockResolvedValue(user);
    transaction.user.findFirst.mockResolvedValue(user);
    transaction.user.update.mockResolvedValue({});
    transaction.userProfile.create.mockResolvedValue({});
    transaction.userProfile.updateMany.mockResolvedValue({ count: 1 });
    transaction.auditLog.create.mockResolvedValue({});
  });

  it("returns privacy-safe defaults when the profile has not been created", async () => {
    const result = await service.getOwnProfile("user-1");

    expect(result).toEqual(
      expect.objectContaining({
        displayName: "Nguyễn An",
        visibility: ProfileVisibility.MEMBERS,
        showEmail: false,
        allowComments: true,
        version: 1,
      }),
    );
  });

  it("creates the owned profile, increments its version and writes a compact audit", async () => {
    transaction.user.findUnique.mockResolvedValue({
      ...user,
      fullName: update.displayName,
      profile: {
        userId: "user-1",
        ...update,
        version: 2,
        phone: update.phone,
        city: update.city,
        bio: update.bio,
      },
    });

    const result = await service.updateOwnProfile("user-1", update, {
      ip: "127.0.0.1",
    });

    expect(result.version).toBe(2);
    expect(transaction.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-1", version: 2 }),
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATE_OWN_PROFILE",
        entityId: "user-1",
        before: expect.objectContaining({ hasAvatar: false }),
        after: expect.objectContaining({ hasAvatar: false, version: 2 }),
      }),
    });
  });

  it("rejects a stale expectedVersion without updating data", async () => {
    transaction.user.findFirst.mockResolvedValue({
      ...user,
      profile: { version: 4 },
    });

    await expect(
      service.updateOwnProfile("user-1", update),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.user.update).not.toHaveBeenCalled();
  });

  it("rejects avatar data larger than 1 MB before writing the profile", async () => {
    const oversizedAvatar = `data:image/png;base64,${Buffer.alloc(1024 * 1024 + 1).toString("base64")}`;

    await expect(
      service.updateOwnProfile("user-1", {
        ...update,
        avatarDataUrl: oversizedAvatar,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.user.update).not.toHaveBeenCalled();
  });

  it("shares only non-contact fields when the profile is public", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      ...user,
      status: UserStatus.ACTIVE,
      partnerMembership: null,
      profile: {
        ...update,
        visibility: ProfileVisibility.PUBLIC,
        showEmail: true,
      },
    });

    const shared = await service.getSharedProfile("user-1", null);

    expect(shared).toEqual({
      id: "user-1",
      displayName: "Nguyễn An",
      role: RoleName.PATIENT,
      city: "Hà Nội",
      bio: "Thành viên Trạm K",
      hasAvatar: false,
    });
    expect(shared).not.toHaveProperty("email");
    expect(shared).not.toHaveProperty("phone");
  });

  it("restricts member and private profiles, including their avatar", async () => {
    const avatarDataUrl = `data:image/png;base64,${Buffer.from("avatar").toString("base64")}`;
    prismaMock.user.findFirst.mockResolvedValue({
      ...user,
      status: UserStatus.ACTIVE,
      partnerMembership: null,
      profile: {
        ...update,
        visibility: ProfileVisibility.MEMBERS,
        avatarDataUrl,
      },
    });
    await expect(
      service.getSharedProfile("user-1", null),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.getSharedAvatar("user-1", null),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(await service.getSharedAvatar("user-1", "other-user")).toEqual({
      mimeType: "image/png",
      bytes: Buffer.from("avatar"),
    });

    prismaMock.user.findFirst.mockResolvedValue({
      ...user,
      status: UserStatus.ACTIVE,
      partnerMembership: null,
      profile: {
        ...update,
        visibility: ProfileVisibility.PRIVATE,
        avatarDataUrl,
      },
    });
    await expect(
      service.getSharedProfile("user-1", "other-user"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.getSharedAvatar("user-1", "other-user"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect((await service.getSharedProfile("user-1", "user-1")).hasAvatar).toBe(
      true,
    );
  });
});
