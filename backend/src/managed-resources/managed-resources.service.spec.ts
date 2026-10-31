import {
  ManagedResourceStatus,
  PartnerStatus,
  RoleName,
  SearchDocumentType,
  UserStatus,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
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
  const transaction = {
    managedResource,
    supportProgramRegistration: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    }
  };
  const prisma = {
    managedResource,
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
    service = new ManagedResourcesService(prisma, search, {} as any);
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

  it("does not allow a partner to publish a support program directly", async () => {
    user.findUnique.mockResolvedValue({
      id: "PARTNER-1",
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.PATIENT },
      partnerMembership: {
        id: "MEMBERSHIP-1",
        status: PartnerStatus.ACTIVE,
      },
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

  it("allows an active partner to update their own draft and preserves its payload", async () => {
    user.findUnique.mockResolvedValue({
      id: "PARTNER-1",
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.PATIENT },
      partnerMembership: {
        id: "MEMBERSHIP-1",
        status: PartnerStatus.ACTIVE,
      },
    });
    managedResource.findUnique.mockResolvedValue({
      payload: { ownerId: "PARTNER-1" },
    });
    managedResource.upsert.mockResolvedValue({
      sourceId: "PROGRAM-1",
      type: SearchDocumentType.SUPPORT_PROGRAM,
      status: ManagedResourceStatus.DRAFT,
      updatedAt: new Date("2026-10-12T08:01:00.000Z"),
    });

    await service.upsert(
      { id: "PARTNER-1", role: RoleName.PARTNER, authVersion: 1 },
      SearchDocumentType.SUPPORT_PROGRAM,
      "PROGRAM-1",
      {
        ...dto,
        status: ManagedResourceStatus.DRAFT,
        payload: {
          ownerId: "PARTNER-1",
          capacity: 10,
          address: "123 Đường ABC, Quận 1, TP.HCM"
        },
      },
    );

    expect(managedResource.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          payload: {
            ownerId: "PARTNER-1",
            capacity: 10,
            address: "123 Đường ABC, Quận 1, TP.HCM"
          },
        }),
        update: expect.objectContaining({
          payload: {
            ownerId: "PARTNER-1",
            capacity: 10,
            address: "123 Đường ABC, Quận 1, TP.HCM"
          },
        }),
      }),
    );
  });

  it("denies an active partner updates to another partner's program", async () => {
    user.findUnique.mockResolvedValue({
      id: "PARTNER-1",
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.PARTNER },
      partnerMembership: {
        id: "MEMBERSHIP-1",
        status: PartnerStatus.ACTIVE,
      },
    });
    managedResource.findUnique.mockResolvedValue({
      payload: { ownerId: "PARTNER-2" },
    });

    await expect(
      service.upsert(
        { id: "PARTNER-1", role: RoleName.PARTNER, authVersion: 1 },
        SearchDocumentType.SUPPORT_PROGRAM,
        "PROGRAM-2",
        {
          ...dto,
          status: ManagedResourceStatus.DRAFT,
          payload: { ownerId: "PARTNER-1" },
        },
      ),
    ).rejects.toThrow("Bạn không có quyền cập nhật chương trình này.");
    expect(managedResource.upsert).not.toHaveBeenCalled();
  });

  it("denies suspended partners updates and deletes of their programs", async () => {
    const suspendedPartner = {
      id: "PARTNER-1",
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.PARTNER },
      partnerMembership: {
        id: "MEMBERSHIP-1",
        status: PartnerStatus.SUSPENDED,
      },
    };
    user.findUnique.mockResolvedValue(suspendedPartner);

    await expect(
      service.upsert(
        { id: "PARTNER-1", role: RoleName.PARTNER, authVersion: 1 },
        SearchDocumentType.SUPPORT_PROGRAM,
        "PROGRAM-1",
        {
          ...dto,
          status: ManagedResourceStatus.DRAFT,
          payload: { ownerId: "PARTNER-1" },
        },
      ),
    ).rejects.toThrow("Bạn không có quyền cập nhật chương trình này.");
    expect(managedResource.upsert).not.toHaveBeenCalled();

    managedResource.findUnique.mockResolvedValue({
      id: "RESOURCE-1",
      type: SearchDocumentType.SUPPORT_PROGRAM,
      payload: { ownerId: "PARTNER-1" },
    });
    await expect(
      service.remove(
        { id: "PARTNER-1", role: RoleName.PARTNER, authVersion: 1 },
        SearchDocumentType.SUPPORT_PROGRAM,
        "PROGRAM-1",
      ),
    ).rejects.toThrow("Bạn không có quyền xóa nội dung này.");
    expect(managedResource.delete).not.toHaveBeenCalled();
    expect(search.deactivate).not.toHaveBeenCalled();
  });

  it("allows an active member with partner membership to delete their own program", async () => {
    user.findUnique.mockResolvedValue({
      id: "PARTNER-1",
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { name: RoleName.PATIENT },
      partnerMembership: {
        id: "MEMBERSHIP-1",
        status: PartnerStatus.ACTIVE,
      },
    });
    managedResource.findUnique.mockResolvedValue({
      id: "RESOURCE-1",
      type: SearchDocumentType.SUPPORT_PROGRAM,
      status: ManagedResourceStatus.PENDING,
      payload: { ownerId: "PARTNER-1" },
    });
    managedResource.delete.mockResolvedValue({});

    await service.remove(
      { id: "PARTNER-1", role: RoleName.PARTNER, authVersion: 1 },
      SearchDocumentType.SUPPORT_PROGRAM,
      "PROGRAM-1",
    );

    expect(managedResource.delete).toHaveBeenCalledWith({
      where: { id: "RESOURCE-1" },
    });
    expect(search.deactivate).toHaveBeenCalledWith(
      SearchDocumentType.SUPPORT_PROGRAM,
      "PROGRAM-1",
      transaction,
    );
  });

  it("returns only published resources to public clients", async () => {
    managedResource.findMany.mockResolvedValue([
      {
        sourceId: "PODCAST-1",
        type: SearchDocumentType.GUIDE,
        status: ManagedResourceStatus.PUBLISHED,
        title: "Một ngày bình an",
        description: "Podcast đồng hành.",
        payload: { source: "Trạm K" },
        publishedAt: new Date("2026-10-12T08:00:00.000Z"),
        updatedAt: new Date("2026-10-12T08:05:00.000Z"),
      },
    ]);
    managedResource.count.mockResolvedValue(1);

    const result = await service.listPublished(SearchDocumentType.GUIDE);

    expect(managedResource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: ManagedResourceStatus.PUBLISHED,
          type: SearchDocumentType.GUIDE,
        },
        skip: 0,
        take: 12,
      }),
    );
    expect(managedResource.count).toHaveBeenCalledWith({
      where: {
        status: ManagedResourceStatus.PUBLISHED,
        type: SearchDocumentType.GUIDE,
      },
    });
    expect(result).toMatchObject({
      items: [{ sourceId: "PODCAST-1" }],
      page: 1,
      pageSize: 12,
      totalItems: 1,
      totalPages: 1,
    });
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
    managedResource.count.mockResolvedValue(1);

    const result = await service.adminState({
      id: "ADMIN-1",
      role: RoleName.ADMIN,
      authVersion: 1,
    });

    expect(result.initialized).toBe(true);
    expect(result.items[0].status).toBe(ManagedResourceStatus.DRAFT);
    expect(result).toMatchObject({ total: 1, page: 1, limit: 20 });
    expect(managedResource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });
});
