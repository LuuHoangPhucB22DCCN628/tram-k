import { InternalServerErrorException } from "@nestjs/common";
import { ManagedResourceStatus, SearchDocumentType } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ListPublicContentsDto } from "./dto/list-public-contents.dto";
import { PublicContentsService } from "./public-contents.service";

describe("PublicContentsService", () => {
  const managedResource = { findMany: jest.fn() };
  const prisma = { managedResource } as unknown as PrismaService;
  let service: PublicContentsService;

  const resource = (
    sourceId: string,
    publishedAt: string,
    options: {
      featured?: boolean;
      title?: string;
      kind?: SearchDocumentType;
      tagName?: string;
      tagSlug?: string;
    } = {},
  ) => {
    const kind = options.kind ?? SearchDocumentType.GUIDE;
    return {
      sourceId,
      type: kind,
      publishedAt: new Date(publishedAt),
      payload: {
        id: sourceId,
        kind,
        slug: sourceId.toLowerCase(),
        title: options.title ?? sourceId,
        excerpt: "Thông tin chăm sóc người bệnh.",
        category: { id: "CAT-1", name: "Điều trị", slug: "dieu-tri" },
        tags: [
          {
            name: options.tagName ?? "Chăm sóc",
            slug: options.tagSlug ?? "cham-soc",
          },
        ],
        coverImage: {
          url: "/cover.png",
          alt: "Ảnh bìa",
          width: 1200,
          height: 628,
        },
        publishedAt,
        readingMinutes: 5,
        featured: options.featured ?? false,
        status: ManagedResourceStatus.PUBLISHED,
        authorName: "Ban biên tập",
        sections: [{ paragraphs: ["Nội dung"] }],
        sources: [],
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PublicContentsService(prisma);
  });

  it("filters before pagination and prioritizes featured content", async () => {
    managedResource.findMany.mockResolvedValue([
      resource("newest", "2026-10-02T08:00:00.000Z", {
        title: "Hóa trị và lưu ý",
      }),
      resource("featured", "2026-10-01T08:00:00.000Z", {
        featured: true,
        title: "Hóa trị và dinh dưỡng",
        tagName: "Hóa trị",
        tagSlug: "hoa-tri",
      }),
    ]);

    const query = Object.assign(new ListPublicContentsDto(), {
      kind: SearchDocumentType.GUIDE,
      search: "hoa tri",
      page: 1,
      pageSize: 1,
    });

    await expect(service.list(query)).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: "featured",
          featured: true,
        }),
      ],
      page: 1,
      pageSize: 1,
      totalItems: 2,
      totalPages: 2,
    });
    expect(managedResource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: ManagedResourceStatus.PUBLISHED,
          type: { in: [SearchDocumentType.GUIDE] },
        },
      }),
    );
  });

  it("returns detail and categories from published content only", async () => {
    managedResource.findMany.mockResolvedValue([
      resource("guide-1", "2026-10-01T08:00:00.000Z"),
    ]);

    await expect(
      service.getBySlug(SearchDocumentType.GUIDE, "guide-1"),
    ).resolves.toEqual(
      expect.objectContaining({
        id: "guide-1",
        status: ManagedResourceStatus.PUBLISHED,
      }),
    );
    await expect(service.categories()).resolves.toEqual([
      { id: "CAT-1", name: "Điều trị", slug: "dieu-tri" },
    ]);
  });

  it("fails explicitly when stored public content has an invalid payload", async () => {
    managedResource.findMany.mockResolvedValue([
      {
        sourceId: "bad-content",
        type: SearchDocumentType.GUIDE,
        publishedAt: new Date("2026-10-01T08:00:00.000Z"),
        payload: {},
      },
    ]);

    await expect(
      service.list(new ListPublicContentsDto()),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
