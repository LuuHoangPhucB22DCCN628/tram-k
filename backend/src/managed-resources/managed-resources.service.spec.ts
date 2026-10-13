import {
  ManagedResourceStatus,
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
  const transaction = { managedResource };
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
    service = new ManagedResourcesService(prisma, search);
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
