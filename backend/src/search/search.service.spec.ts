import { SearchDocumentType } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { SearchService } from "./search.service";

describe("SearchService", () => {
  const searchDocument = {
    findMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    updateMany: jest.fn(),
  };
  const prisma = {
    searchDocument,
    $transaction: jest.fn((operations: readonly Promise<unknown>[]) => Promise.all(operations)),
  } as unknown as PrismaService;
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SearchService(prisma);
  });

  it("normalizes Vietnamese text, scopes public results and returns pagination metadata", async () => {
    searchDocument.findMany.mockResolvedValue([
      {
        id: "INDEX-2",
        sourceId: "GUIDE-2",
        type: SearchDocumentType.GUIDE,
        title: "Điều trị ung thư an toàn",
        description: "Thông tin tham khảo.",
        eyebrow: "Cẩm nang",
        metadata: "Điều trị · 5 phút đọc",
        imageUrl: "/guide-2.png",
        imageAlt: "Ảnh cẩm nang",
        link: "/cam-nang/dieu-tri-an-toan",
        queryParams: null,
        normalizedTitle: "dieu tri ung thu an toan",
        normalizedText: "dieu tri ung thu an toan thong tin tham khao",
        publishedAt: new Date("2026-10-02T00:00:00.000Z"),
      },
      {
        id: "INDEX-1",
        sourceId: "GUIDE-1",
        type: SearchDocumentType.GUIDE,
        title: "Ung thư",
        description: "Kiến thức tổng quan.",
        eyebrow: "Cẩm nang",
        metadata: "Tổng quan",
        imageUrl: null,
        imageAlt: null,
        link: "/cam-nang/ung-thu",
        queryParams: null,
        normalizedTitle: "ung thu",
        normalizedText: "ung thu kien thuc tong quan",
        publishedAt: new Date("2026-10-01T00:00:00.000Z"),
      },
    ]);
    searchDocument.count.mockResolvedValue(2);

    const result = await service.search({ q: "  Ung thư ", page: 1, pageSize: 8 });

    expect(searchDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true, normalizedText: { contains: "ung thu" } },
        skip: 0,
        take: 8,
      }),
    );
    expect(result.items.map((item) => item.id)).toEqual(["GUIDE-1", "GUIDE-2"]);
    expect(result).toEqual(expect.objectContaining({ totalItems: 2, totalPages: 1 }));
  });

  it("upserts a normalized document using the type and source id as the stable key", async () => {
    searchDocument.upsert.mockResolvedValue({ id: "INDEX-1" });

    await service.upsert({
      sourceId: " GUIDE-1 ",
      type: SearchDocumentType.GUIDE,
      title: " Dinh dưỡng trong hóa trị ",
      description: " Các bữa ăn dễ áp dụng. ",
      eyebrow: " Cẩm nang ",
      metadata: " Dinh dưỡng ",
      link: " /cam-nang/dinh-duong-hoa-tri ",
      searchableText: "ung thư",
      publishedAt: new Date("2026-10-01T00:00:00.000Z"),
    });

    expect(searchDocument.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type_sourceId: { type: SearchDocumentType.GUIDE, sourceId: "GUIDE-1" },
        },
        create: expect.objectContaining({
          title: "Dinh dưỡng trong hóa trị",
          normalizedTitle: "dinh duong trong hoa tri",
          normalizedText: expect.stringContaining("ung thu"),
        }),
      }),
    );
  });

  it("deactivates only the requested published search document", async () => {
    searchDocument.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.deactivate(SearchDocumentType.PODCAST, "PODCAST-1"),
    ).resolves.toBe(true);
    expect(searchDocument.updateMany).toHaveBeenCalledWith({
      where: { type: SearchDocumentType.PODCAST, sourceId: "PODCAST-1", active: true },
      data: { active: false },
    });
  });
});
