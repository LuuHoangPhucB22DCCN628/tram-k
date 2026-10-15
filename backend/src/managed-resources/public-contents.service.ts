import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ManagedResourceStatus, SearchDocumentType } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import {
  ListPublicContentsDto,
  PUBLIC_CONTENT_KINDS,
  PublicContentKind,
} from "./dto/list-public-contents.dto";

interface PublicContentRecord extends Record<string, unknown> {
  readonly id: string;
  readonly kind: PublicContentKind;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly category: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
  };
  readonly tags: readonly { readonly name: string; readonly slug: string }[];
  readonly coverImage: {
    readonly url: string;
    readonly alt: string;
    readonly width: number;
    readonly height: number;
  };
  readonly publishedAt: string;
  readonly readingMinutes: number;
  readonly featured: boolean;
  readonly status: "PUBLISHED";
  readonly authorName: string;
  readonly sections: readonly unknown[];
  readonly sources: readonly unknown[];
}

@Injectable()
export class PublicContentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListPublicContentsDto) {
    const resources = await this.prisma.managedResource.findMany({
      where: {
        status: ManagedResourceStatus.PUBLISHED,
        type: {
          in: query.kind ? [query.kind] : [...PUBLIC_CONTENT_KINDS],
        },
      },
      select: {
        sourceId: true,
        type: true,
        payload: true,
        publishedAt: true,
      },
    });

    const filtered = resources
      .map((resource) => this.toContentRecord(resource))
      .filter(
        (content) =>
          !query.categorySlug || content.category.slug === query.categorySlug,
      )
      .filter(
        (content) =>
          !query.tagSlug ||
          content.tags.some((tag) => tag.slug === query.tagSlug),
      )
      .filter(
        (content) =>
          query.featured === undefined || content.featured === query.featured,
      )
      .filter(
        (content) => !query.search || this.matchesSearch(content, query.search),
      )
      .sort(
        (first, second) =>
          Number(second.featured) - Number(first.featured) ||
          second.publishedAt.localeCompare(first.publishedAt) ||
          second.id.localeCompare(first.id),
      );

    const totalItems = filtered.length;
    const start = (query.page - 1) * query.pageSize;
    return {
      items: filtered.slice(start, start + query.pageSize).map((content) => {
        const {
          status: _status,
          authorName: _authorName,
          sections: _sections,
          sources: _sources,
          medicalDisclaimer: _medicalDisclaimer,
          detailLead: _detailLead,
          ...summary
        } = content;
        return summary;
      }),
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
    };
  }

  async getBySlug(kind: PublicContentKind, slug: string) {
    const resources = await this.prisma.managedResource.findMany({
      where: {
        type: kind,
        status: ManagedResourceStatus.PUBLISHED,
      },
      select: {
        sourceId: true,
        type: true,
        payload: true,
        publishedAt: true,
      },
    });
    const content = resources
      .map((resource) => this.toContentRecord(resource))
      .find((item) => item.slug === slug);

    if (!content) {
      throw new NotFoundException(
        "Nội dung không tồn tại hoặc chưa được xuất bản.",
      );
    }

    return content;
  }

  async categories(kind?: PublicContentKind) {
    const resources = await this.prisma.managedResource.findMany({
      where: {
        status: ManagedResourceStatus.PUBLISHED,
        type: {
          in: kind ? [kind] : [...PUBLIC_CONTENT_KINDS],
        },
      },
      select: {
        sourceId: true,
        type: true,
        payload: true,
        publishedAt: true,
      },
    });
    const categories = new Map<string, PublicContentRecord["category"]>();

    for (const resource of resources) {
      const content = this.toContentRecord(resource);
      categories.set(content.category.id, content.category);
    }

    return [...categories.values()].sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  }

  private toContentRecord(resource: {
    readonly sourceId: string;
    readonly type: SearchDocumentType;
    readonly payload: unknown;
    readonly publishedAt: Date;
  }): PublicContentRecord {
    if (
      !this.isContentRecord(resource.payload, resource.type, resource.sourceId)
    ) {
      throw new InternalServerErrorException(
        "Dữ liệu nội dung công khai không hợp lệ.",
      );
    }

    return {
      ...resource.payload,
      publishedAt: resource.publishedAt.toISOString(),
      status: ManagedResourceStatus.PUBLISHED,
    };
  }

  private isContentRecord(
    value: unknown,
    type: SearchDocumentType,
    sourceId: string,
  ): value is PublicContentRecord {
    if (!this.isRecord(value) || !this.isPublicContentKind(type)) {
      return false;
    }
    return (
      value["id"] === sourceId &&
      value["kind"] === type &&
      typeof value["slug"] === "string" &&
      typeof value["title"] === "string" &&
      typeof value["excerpt"] === "string" &&
      this.isRecord(value["category"]) &&
      typeof value["category"]["id"] === "string" &&
      typeof value["category"]["name"] === "string" &&
      typeof value["category"]["slug"] === "string" &&
      Array.isArray(value["tags"]) &&
      value["tags"].every(
        (tag) =>
          this.isRecord(tag) &&
          typeof tag["name"] === "string" &&
          typeof tag["slug"] === "string",
      ) &&
      this.isRecord(value["coverImage"]) &&
      typeof value["coverImage"]["url"] === "string" &&
      typeof value["coverImage"]["alt"] === "string" &&
      typeof value["coverImage"]["width"] === "number" &&
      typeof value["coverImage"]["height"] === "number" &&
      typeof value["readingMinutes"] === "number" &&
      typeof value["featured"] === "boolean" &&
      value["status"] === ManagedResourceStatus.PUBLISHED &&
      typeof value["authorName"] === "string" &&
      Array.isArray(value["sections"]) &&
      Array.isArray(value["sources"])
    );
  }

  private isPublicContentKind(
    type: SearchDocumentType,
  ): type is PublicContentKind {
    return PUBLIC_CONTENT_KINDS.some((kind) => kind === type);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private matchesSearch(content: PublicContentRecord, search: string): boolean {
    const searchable = [
      content.title,
      content.excerpt,
      content.category.name,
      ...content.tags.map((tag) => tag.name),
    ].join(" ");
    return this.normalize(searchable).includes(this.normalize(search));
  }

  private normalize(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }
}
