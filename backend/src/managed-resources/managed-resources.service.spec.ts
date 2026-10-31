import {
  ManagedResourceStatus,
  NotificationKind,
  RoleName,
  SearchDocumentType,
  UserStatus,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SearchService } from "../search/search.service";
import { ManagedResourcesService } from "./managed-resources.service";

describe("ManagedResourcesService", () => {
  const managedResource = {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  };
  const user = { findUnique: jest.fn() };
  const supportProgramRegistration = { findMany: jest.fn(), deleteMany: jest.fn() };
  const transaction = { managedResource, supportProgramRegistration };
  const prisma = {
    managedResource,
    supportProgramRegistration,
    user,
    $transaction: jest.fn(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    ),
  } as unknown as PrismaService;
  const search = {
    upsert: jest.fn(),
    deactivate: jest.fn(),
  } as unknown as SearchService;
  const notificationCreate = jest.fn();
  const notifications = { create: notificationCreate } as unknown as NotificationsService;
  let service: ManagedResourcesService;

  const dto = {
    status: ManagedResourceStatus.PUBLISHED,
    title: "Dinh dưỡng trong hóa trị",
    description: "Gợi ý chuẩn bị bữa ăn trong thời gian điều trị.",
    eyebrow: "Cẩm nang",
    metadata: "Dinh dưỡng · 5 phút đọc",
    link: "/cam-nang/dinh-duong-hoa-tri",
    publishedAt: "2026-10-12T08:00:00.000Z",
    payload: { category: "Dinh dưỡng" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    supportProgramRegistration.deleteMany.mockResolvedValue({ count: 1 });
    supportProgramRegistration.findMany.mockResolvedValue([]);
    managedResource.findUnique.mockResolvedValue(null);
    service = new ManagedResourcesService(prisma, search, notifications);
    user.findUnique.mockResolvedValue({
      id: "ADMIN-1",
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.ADMIN },
      partnerMembership: null,
    });
    managedResource.upsert.mockResolvedValue({
      sourceId: "GUIDE-1",
      type: SearchDocumentType.GUIDE,
      status: ManagedResourceStatus.PUBLISHED,
      updatedAt: new Date("2026-10-12T08:01:00.000Z"),
    });
  });

  it("deletes a program and its registrations in the same transaction", async () => {
    managedResource.findUnique.mockResolvedValue({
      id: "resource-1", type: SearchDocumentType.SUPPORT_PROGRAM,
      status: ManagedResourceStatus.PUBLISHED, title: "Bữa cơm yêu thương", payload: { ownerId: "partner-1" },
    });
    supportProgramRegistration.findMany.mockResolvedValue([{ userId: "PATIENT-1" }]);
    const result = await service.remove(
      { id: "ADMIN-1", role: RoleName.ADMIN, authVersion: 1 },
      SearchDocumentType.SUPPORT_PROGRAM,
      "PROGRAM-1",
    );
    expect(result).toEqual({ deletedRegistrations: 1 });
    expect(supportProgramRegistration.deleteMany).toHaveBeenCalledWith({ where: { programId: "PROGRAM-1" } });
    expect(managedResource.delete).toHaveBeenCalledWith({ where: { id: "resource-1" } });
    expect(search.deactivate).toHaveBeenCalledWith(
      SearchDocumentType.SUPPORT_PROGRAM, "PROGRAM-1", transaction,
    );
    expect(notificationCreate).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: "PATIENT-1", kind: NotificationKind.PROGRAM_DELETED,
      link: "/cong-dong/chuong-trinh-ho-tro",
    }), transaction);
  });

  it.each([
    [ManagedResourceStatus.PUBLISHED, NotificationKind.PROGRAM_PUBLISHED],
    [ManagedResourceStatus.REJECTED, NotificationKind.PROGRAM_REJECTED],
  ])("notifies the partner when admin reviews a pending program as %s", async (status, kind) => {
    managedResource.findUnique.mockResolvedValue({ status: ManagedResourceStatus.PENDING });
    managedResource.upsert.mockResolvedValue({
      sourceId: "PROGRAM-1", type: SearchDocumentType.SUPPORT_PROGRAM,
      status, title: "Bữa cơm yêu thương",
      updatedAt: new Date("2026-10-23T08:01:00.000Z"),
    });
    await service.upsert(
      { id: "ADMIN-1", role: RoleName.ADMIN, authVersion: 1 },
      SearchDocumentType.SUPPORT_PROGRAM,
      "PROGRAM-1",
      { ...dto, status, payload: { ownerId: "PARTNER-1", address: "Bệnh viện K Tân Triều, Hà Nội", reviewReason: "Cần bổ sung lịch phát rõ ràng" } },
    );
    expect(notificationCreate).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: "PARTNER-1", kind,
    }), transaction);
  });

  it("does not notify a partner again when an already published program is edited", async () => {
    managedResource.findUnique.mockResolvedValue({ status: ManagedResourceStatus.PUBLISHED });
    await service.upsert(
      { id: "ADMIN-1", role: RoleName.ADMIN, authVersion: 1 },
      SearchDocumentType.SUPPORT_PROGRAM,
      "PROGRAM-1",
      { ...dto, payload: { ownerId: "PARTNER-1", address: "Bệnh viện K Tân Triều, Hà Nội" } },
    );
    expect(notificationCreate).not.toHaveBeenCalled();
  });

  it("stores and indexes a published admin article in one transaction", async () => {
    const result = await service.upsert(
      { id: "ADMIN-1", role: RoleName.ADMIN, authVersion: 1 },
      SearchDocumentType.GUIDE,
      "GUIDE-1",
      dto,
    );

    expect(managedResource.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type_sourceId: {
            type: SearchDocumentType.GUIDE,
            sourceId: "GUIDE-1",
          },
        },
      }),
    );
    expect(search.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: "GUIDE-1",
        type: SearchDocumentType.GUIDE,
        active: true,
      }),
      transaction,
    );
    expect(result.status).toBe(ManagedResourceStatus.PUBLISHED);
  });

  it("deactivates the search document when content is archived", async () => {
    await service.upsert(
      { id: "ADMIN-1", role: RoleName.ADMIN, authVersion: 1 },
      SearchDocumentType.GUIDE,
      "GUIDE-1",
      { ...dto, status: ManagedResourceStatus.ARCHIVED },
    );

    expect(search.deactivate).toHaveBeenCalledWith(
      SearchDocumentType.GUIDE,
      "GUIDE-1",
      transaction,
    );
    expect(search.upsert).not.toHaveBeenCalled();
  });

  it("persists a map location without indexing it as an article", async () => {
    await service.upsert(
      { id: "ADMIN-1", role: RoleName.ADMIN, authVersion: 1 },
      SearchDocumentType.DONATION_LOCATION,
      "tan-trieu",
      {
        ...dto,
        title: "Viện K Tân Triều",
        payload: { status: "INACTIVE", latitude: 21.03, longitude: 105.79 },
      },
    );

    expect(managedResource.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type_sourceId: {
            type: SearchDocumentType.DONATION_LOCATION,
            sourceId: "tan-trieu",
          },
        },
      }),
    );
    expect(search.deactivate).toHaveBeenCalledWith(
      SearchDocumentType.DONATION_LOCATION,
      "tan-trieu",
      transaction,
    );
    expect(search.upsert).not.toHaveBeenCalled();
  });

  it("rejects donation locations without both valid GPS coordinates", async () => {
    const actor = { id: "ADMIN-1", role: RoleName.ADMIN, authVersion: 1 };
    await expect(
      service.upsert(actor, SearchDocumentType.DONATION_LOCATION, "new-location", {
        ...dto,
        payload: { latitude: 21.03 },
      }),
    ).rejects.toThrow("Chưa điền kinh độ GPS hợp lệ.");
    await expect(
      service.upsert(actor, SearchDocumentType.DONATION_LOCATION, "new-location", {
        ...dto,
        payload: { latitude: 91, longitude: 105.79 },
      }),
    ).rejects.toThrow("Vĩ độ GPS phải từ -90 đến 90.");
    expect(managedResource.upsert).not.toHaveBeenCalled();
  });

  it("does not allow a partner to publish a support program directly", async () => {
    user.findUnique.mockResolvedValue({
      id: "PARTNER-1",
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.PATIENT },
      partnerMembership: { id: "MEMBERSHIP-1" },
    });

    await expect(
      service.upsert(
        { id: "PARTNER-1", role: RoleName.PARTNER, authVersion: 1 },
        SearchDocumentType.SUPPORT_PROGRAM,
        "PROGRAM-1",
        { ...dto, payload: { ownerId: "PARTNER-1" } },
      ),
    ).rejects.toThrow("Bạn không có quyền cập nhật chương trình này.");
  });

  it("rejects a support program with a missing or placeholder address", async () => {
    const actor = { id: "ADMIN-1", role: RoleName.ADMIN, authVersion: 1 };
    const input = { ...dto, status: ManagedResourceStatus.PENDING };

    await expect(service.upsert(actor, SearchDocumentType.SUPPORT_PROGRAM, "PROGRAM-1", {
      ...input, payload: { address: "" },
    })).rejects.toThrow("Vui lòng nhập địa chỉ tổ chức cụ thể.");
    await expect(service.upsert(actor, SearchDocumentType.SUPPORT_PROGRAM, "PROGRAM-1", {
      ...input, payload: { address: "dddddddddddddd" },
    })).rejects.toThrow("Địa chỉ tổ chức chưa đủ cụ thể");
    expect(managedResource.upsert).not.toHaveBeenCalled();
  });

  it("requires a valid structured schedule for a newly submitted program", async () => {
    const actor = { id: "ADMIN-1", role: RoleName.ADMIN, authVersion: 1 };
    const input = { ...dto, status: ManagedResourceStatus.PENDING };
    await expect(service.upsert(actor, SearchDocumentType.SUPPORT_PROGRAM, "PROGRAM-2", {
      ...input, payload: { address: "Bệnh viện K Tân Triều", schedule: "Thứ Hai" },
    })).rejects.toThrow("Vui lòng chọn ngày, khung giờ");
    expect(managedResource.upsert).not.toHaveBeenCalled();
  });

  it("returns only published resources to public clients", async () => {
    managedResource.findMany.mockResolvedValue([
      {
        sourceId: "PODCAST-1",
        type: SearchDocumentType.PODCAST,
        status: ManagedResourceStatus.PUBLISHED,
        title: "Một ngày bình an",
        description: "Podcast đồng hành.",
        payload: { source: "Trạm K" },
        publishedAt: new Date("2026-10-12T08:00:00.000Z"),
        updatedAt: new Date("2026-10-12T08:05:00.000Z"),
      },
    ]);

    const result = await service.listPublished(SearchDocumentType.PODCAST);

    expect(managedResource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: ManagedResourceStatus.PUBLISHED,
          type: SearchDocumentType.PODCAST,
        },
      }),
    );
    expect(result[0].sourceId).toBe("PODCAST-1");
  });

  it("distinguishes an initialized empty collection from an uninitialized one", async () => {
    managedResource.findMany.mockResolvedValue([]);
    managedResource.count.mockResolvedValue(2);

    await expect(
      service.publicState(SearchDocumentType.STORY),
    ).resolves.toEqual({ initialized: true, items: [] });
    expect(managedResource.count).toHaveBeenCalledWith({
      where: { type: SearchDocumentType.STORY },
    });
  });

  it("allows an active admin to load draft and archived resources", async () => {
    managedResource.findMany.mockResolvedValue([
      {
        sourceId: "GUIDE-DRAFT",
        type: SearchDocumentType.GUIDE,
        status: ManagedResourceStatus.DRAFT,
        title: "Bài nháp",
        description: "Nội dung chưa công khai.",
        payload: { id: "GUIDE-DRAFT", status: "DRAFT" },
        publishedAt: new Date("2026-10-12T08:00:00.000Z"),
        updatedAt: new Date("2026-10-12T09:00:00.000Z"),
      },
    ]);

    const result = await service.adminState({
      id: "ADMIN-1",
      role: RoleName.ADMIN,
      authVersion: 1,
    });

    expect(result.initialized).toBe(true);
    expect(result.items[0].status).toBe(ManagedResourceStatus.DRAFT);
  });
});
