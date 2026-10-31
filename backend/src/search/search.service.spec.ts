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
  const managedResource = { findMany: jest.fn() };
  const supportProgramRegistration = { groupBy: jest.fn() };
  const prisma = {
    searchDocument,
    managedResource,
    supportProgramRegistration,
    $transaction: jest.fn((operations: readonly Promise<unknown>[]) => Promise.all(operations)),
  } as unknown as PrismaService;
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    managedResource.findMany.mockResolvedValue([]);
    supportProgramRegistration.groupBy.mockResolvedValue([]);
    service = new SearchService(prisma);
  });

  it("only recommends published active locations and programs with remaining capacity", async () => {
    managedResource.findMany.mockResolvedValue([
      { sourceId: "meal-open", type: SearchDocumentType.SUPPORT_PROGRAM, status: "PUBLISHED", title: "Bữa cơm", description: "Suất cơm", payload: { status: "PUBLISHED", regionId: "ha-noi", city: "Hà Nội", address: "Bệnh viện K", schedule: "24/10/2099", scheduleType: "ONE_TIME", startsOn: "2099-10-24", startTime: "09:00", endTime: "11:00", supportType: "MEAL", capacity: 10 } },
      { sourceId: "meal-full", type: SearchDocumentType.SUPPORT_PROGRAM, status: "PUBLISHED", title: "Đã đầy", description: "Suất cơm", payload: { status: "PUBLISHED", regionId: "ha-noi", city: "Hà Nội", address: "Bệnh viện K", schedule: "24/10/2099", scheduleType: "ONE_TIME", startsOn: "2099-10-24", startTime: "09:00", endTime: "11:00", supportType: "MEAL", capacity: 2 } },
      { sourceId: "spot-active", type: SearchDocumentType.DONATION_LOCATION, status: "PUBLISHED", title: "Điểm nhận", description: "Phát cơm", payload: { status: "ACTIVE", regionId: "ha-noi", address: "Tân Triều", schedule: "Thứ Hai, 09:00–11:00", weekdays: [1], startTime: "09:00", endTime: "11:00" } },
      { sourceId: "spot-inactive", type: SearchDocumentType.DONATION_LOCATION, status: "PUBLISHED", title: "Tạm dừng", description: "Phát cơm", payload: { status: "INACTIVE", regionId: "ha-noi", address: "Tân Triều", schedule: "Chủ Nhật" } },
    ]);
    supportProgramRegistration.groupBy.mockResolvedValue([
      { programId: "meal-open", _count: { _all: 3 } },
      { programId: "meal-full", _count: { _all: 2 } },
    ]);
    const options = await service.publishedSupportOptions();
    expect(options.map((option) => option.id)).toEqual([
      "meal-open", "spot-active", "tan-trieu", "ung-buou-ha-noi", "vien-y-hoc-quan-doi",
    ]);
    expect(options[0].capacityRemaining).toBe(7);
    expect(options.find((option) => option.id === "spot-active")?.recurringSchedule)
      .toEqual({ weekdays: [1], startTime: "09:00", endTime: "11:00" });
    expect(supportProgramRegistration.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { not: "REJECTED" } }),
    }));
  });

  it("uses a managed Hanoi point instead of the baseline and respects an inactive override", async () => {
    managedResource.findMany.mockResolvedValue([
      { sourceId: "tan-trieu", type: SearchDocumentType.DONATION_LOCATION, title: "Tân Triều mới", description: "", payload: { status: "ACTIVE", regionId: "ha-noi", address: "Địa chỉ đã cập nhật", schedule: "Thứ Hai" } },
      { sourceId: "ung-buou-ha-noi", type: SearchDocumentType.DONATION_LOCATION, title: "Tạm dừng", description: "", payload: { status: "INACTIVE", regionId: "ha-noi", address: "Thanh Nhàn", schedule: "Thứ Bảy" } },
    ]);

    const options = await service.publishedSupportOptions();

    expect(options.filter((item) => item.id === "tan-trieu")).toEqual([
      expect.objectContaining({ address: "Địa chỉ đã cập nhật", schedule: "Thứ Hai" }),
    ]);
    expect(options.map((item) => item.id)).not.toContain("ung-buou-ha-noi");
    expect(options.map((item) => item.id)).toContain("vien-y-hoc-quan-doi");
  });

  it("flags a published program with a placeholder address for human review", async () => {
    managedResource.findMany.mockResolvedValue([{
      sourceId: "cao-bang-meal", type: SearchDocumentType.SUPPORT_PROGRAM,
      title: "Bữa cơm yêu thương", description: "Suất cơm", payload: {
        status: "PUBLISHED", regionId: "cao-bang", city: "Cao Bằng",
        address: "dddddddddddddd", schedule: "24/10/2099", scheduleType: "ONE_TIME",
        startsOn: "2099-10-24", startTime: "09:00", endTime: "11:00", supportType: "MEAL", capacity: 10,
      },
    }]);

    const options = await service.publishedSupportOptions();

    expect(options.find((option) => option.id === "cao-bang-meal")).toEqual(expect.objectContaining({
      addressNeedsReview: true,
    }));
  });

  it("does not recommend a structured program after its final session ended", async () => {
    managedResource.findMany.mockResolvedValue([{
      sourceId: "expired-meal", type: SearchDocumentType.SUPPORT_PROGRAM,
      title: "Suất cơm cũ", description: "Suất cơm", payload: {
        status: "PUBLISHED", regionId: "ha-noi", city: "Hà Nội",
        address: "Bệnh viện K Tân Triều", schedule: "09:00–11:00, ngày 01/01/2020",
        scheduleType: "ONE_TIME", startsOn: "2020-01-01", startTime: "09:00", endTime: "11:00",
        supportType: "MEAL", capacity: 20,
      },
    }]);

    const options = await service.publishedSupportOptions();

    expect(options.map((option) => option.id)).not.toContain("expired-meal");
  });

  it("does not recommend a legacy program without dated schedule", async () => {
    managedResource.findMany.mockResolvedValue([{
      sourceId: "legacy-meal", type: SearchDocumentType.SUPPORT_PROGRAM,
      title: "Lịch cũ", description: "Suất cơm", payload: {
        status: "PUBLISHED", regionId: "ha-noi", address: "Bệnh viện K Tân Triều",
        schedule: "Thứ Hai", capacity: 10,
      },
    }]);
    const options = await service.publishedSupportOptions();
    expect(options.map((option) => option.id)).not.toContain("legacy-meal");
  });

  it("excludes expired and legacy programs before search pagination and count", async () => {
    managedResource.findMany.mockResolvedValue([
      { sourceId: "future", payload: { status: "PUBLISHED", scheduleType: "ONE_TIME",
        startsOn: "2099-10-24", startTime: "09:00", endTime: "11:00" } },
      { sourceId: "expired", payload: { status: "PUBLISHED", scheduleType: "ONE_TIME",
        startsOn: "2020-01-01", startTime: "09:00", endTime: "11:00" } },
      { sourceId: "legacy", payload: { status: "PUBLISHED", schedule: "Thứ Hai" } },
    ]);
    searchDocument.findMany.mockResolvedValue([]);
    searchDocument.count.mockResolvedValue(0);
    await service.search({ q: "suất cơm", type: SearchDocumentType.SUPPORT_PROGRAM, page: 1, pageSize: 8 });
    expect(searchDocument.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: [{ sourceId: { in: ["future"] } }] }),
    }));
    expect(searchDocument.count).toHaveBeenCalledWith({ where: expect.objectContaining({
      OR: [{ sourceId: { in: ["future"] } }],
    }) });
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
        where: expect.objectContaining({ active: true, normalizedText: { contains: "ung thu" },
          OR: [{ type: { not: SearchDocumentType.SUPPORT_PROGRAM } },
            { type: SearchDocumentType.SUPPORT_PROGRAM, sourceId: { in: [] } }] }),
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

  it("extracts answer passages only from published resources", async () => {
    managedResource.findMany.mockResolvedValue([{
      sourceId: "GUIDE-1",
      type: SearchDocumentType.GUIDE,
      description: "Tóm tắt bài viết.",
      payload: { detailLead: "Lời dẫn.", sections: [{ heading: "Dấu hiệu", paragraphs: ["Trao đổi các dấu hiệu với bác sĩ."], bullets: ["Ghi lại câu hỏi."] }] },
    }]);

    const result = await service.publishedPassages([{ id: "GUIDE-1", type: SearchDocumentType.GUIDE }]);

    expect(managedResource.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "PUBLISHED", OR: [{ sourceId: "GUIDE-1", type: SearchDocumentType.GUIDE }] }),
    }));
    expect(result[0].passages).toContain("Trao đổi các dấu hiệu với bác sĩ.");
  });
});
