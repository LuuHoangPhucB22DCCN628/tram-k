import { SearchDocumentType } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { SearchService } from "./search.service";

describe("SearchService", () => {
  const searchDocument = {
    count: jest.fn(),
    upsert: jest.fn(),
    updateMany: jest.fn(),
  };
  const queryRaw = jest.fn();
  const prisma = {
    searchDocument,
    $queryRaw: queryRaw,
  } as unknown as PrismaService;
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SearchService(prisma);
    searchDocument.count.mockResolvedValue(0);
    queryRaw.mockResolvedValue([]);
  });

  it("normalizes accented and unaccented Vietnamese queries before searching", async () => {
    await service.search({ q: "  ĐIỀU   TRỊ  ", page: 1, pageSize: 8 });

    const [, ...values] = queryRaw.mock.calls[0];
    expect(values).toContain("dieu tri");
  });

  it("ranks matching documents globally before applying pagination", async () => {
    const olderExactTitle = {
      id: "index-exact",
      sourceId: "GUIDE-EXACT",
      type: SearchDocumentType.GUIDE,
      title: "ung thu",
      description: "Thông tin hướng dẫn.",
      eyebrow: "Cẩm nang",
      metadata: "Sức khỏe",
      imageUrl: null,
      imageAlt: null,
      link: "/cam-nang/ung-thu",
      queryParams: null,
      publishedAt: new Date("2026-10-01T00:00:00.000Z"),
      score: 100,
    };
    const newerPartialTitle = {
      ...olderExactTitle,
      id: "index-partial",
      sourceId: "GUIDE-PARTIAL",
      title: "Chăm sóc người bệnh ung thư",
      link: "/cam-nang/cham-soc",
      publishedAt: new Date("2026-10-20T00:00:00.000Z"),
      score: 30,
    };
    queryRaw.mockResolvedValueOnce([olderExactTitle]);
    queryRaw.mockResolvedValueOnce([newerPartialTitle]);
    searchDocument.count.mockResolvedValue(2);

    const firstPage = await service.search({ q: "ung thu", page: 1, pageSize: 1 });
    const secondPage = await service.search({ q: "ung thu", page: 2, pageSize: 1 });

    for (const [templateStrings] of queryRaw.mock.calls) {
      const sql = (templateStrings as TemplateStringsArray).join(" ");
      expect(sql).toContain("ORDER BY score DESC, published_at DESC, id DESC");
      expect(sql).toContain("LIMIT");
      expect(sql).toContain("OFFSET");
      expect(sql).toContain("active = true");
      expect(sql).toContain("published_at <=");
    }

    expect(firstPage.items.map((item) => item.id)).toEqual(["GUIDE-EXACT"]);
    expect(secondPage.items.map((item) => item.id)).toEqual(["GUIDE-PARTIAL"]);

    const firstPageValues = queryRaw.mock.calls[0].slice(1);
    const secondPageValues = queryRaw.mock.calls[1].slice(1);
    expect(firstPageValues).toContain(0);
    expect(secondPageValues).toContain(1);
    expect(firstPageValues).toContain(1);
  });

  it("counts only active, already-published documents matching the normalized query", async () => {
    await service.search({
      q: "  ung thư  ",
      type: SearchDocumentType.GUIDE,
      page: 1,
      pageSize: 10,
    });

    expect(searchDocument.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: true,
          type: SearchDocumentType.GUIDE,
          publishedAt: { lte: expect.any(Date) },
          normalizedText: { contains: "ung thu" },
        }),
      }),
    );
  });

  it("maps raw search rows to the public result identifier and publishedAt field", async () => {
    queryRaw.mockResolvedValueOnce([
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
        publishedAt: new Date("2026-10-01T00:00:00.000Z"),
        score: 100,
      },
    ]);

    const result = await service.search({ q: "ung thu", page: 1, pageSize: 10 });
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: "GUIDE-1",
        publishedAt: "2026-10-01T00:00:00.000Z",
        score: 100,
      }),
    );
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

  it("deactivates only the requested search document", async () => {
    searchDocument.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.deactivate(SearchDocumentType.GUIDE, "PODCAST-1"),
    ).resolves.toBe(true);
    expect(searchDocument.updateMany).toHaveBeenCalledWith({
      where: { type: SearchDocumentType.GUIDE, sourceId: "PODCAST-1", active: true },
      data: { active: false },
    });
  });
});
