import { Injectable } from "@nestjs/common";
import { Prisma, SearchDocumentType } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { SearchQueryDto } from "./dto/search-query.dto";

export interface UpsertSearchDocumentInput {
  readonly sourceId: string;
  readonly type: SearchDocumentType;
  readonly title: string;
  readonly description: string;
  readonly eyebrow: string;
  readonly metadata: string;
  readonly imageUrl?: string;
  readonly imageAlt?: string;
  readonly link: string;
  readonly queryParams?: Prisma.InputJsonValue;
  readonly searchableText?: string;
  readonly publishedAt: Date;
  readonly active?: boolean;
}

type SearchDocumentWriter = Pick<PrismaService, "searchDocument">;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) { }

  async search(query: SearchQueryDto) {
    const normalizedQuery = this.normalize(query.q);
    const skip = (query.page - 1) * query.pageSize;
    const now = new Date();

    const typeCondition = query.type
      ? Prisma.sql`AND type = ${query.type}::"SearchDocumentType`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        id,
        source_id as "sourceId",
        type,
        title,
        description,
        eyebrow,
        metadata,
        image_url as "imageUrl",
        image_alt as "imageAlt",
        link,
        query_params as "queryParams",
        published_at as "publishedAt",
        CASE
          WHEN normalized_title = ${normalizedQuery} THEN 100
          WHEN normalized_title LIKE ${normalizedQuery + '%'} THEN 80
          WHEN normalized_title LIKE ${'%' + normalizedQuery + '%'} THEN 60
          WHEN normalized_text LIKE ${'%' + normalizedQuery + '%'} THEN 30
          ELSE 0
        END as score
      FROM search_documents
      WHERE active = true
        AND published_at <= ${now}
        AND normalized_text LIKE ${'%' + normalizedQuery + '%'}
        ${typeCondition}
      ORDER BY score DESC, published_at DESC, id DESC
      LIMIT ${query.pageSize} OFFSET ${skip};
      `;

    const where = {
      active: true,
      publishedAt: { lte: now },
      ...(query.type ? { type: query.type } : {}),
      normalizedText: { contains: normalizedQuery },
    }
    const totalItems = await this.prisma.searchDocument.count({ where });

    const items = rows.map((row) => ({
      id: row.sourceId,
      type: row.type,
      title: row.title,
      description: row.description,
      eyebrow: row.eyebrow,
      metadata: row.metadata,
      image: row.imageUrl,
      imageAlt: row.imageAlt,
      link: row.link,
      queryParams: row.queryParams,
      publishedAt: new Date(row.publishedAt).toISOString(),
      score: Number(row.score),
    }));

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
    };
  }

  async upsert(
    input: UpsertSearchDocumentInput,
    writer: SearchDocumentWriter = this.prisma,
  ) {
    const title = input.title.trim();
    const description = input.description.trim();
    const eyebrow = input.eyebrow.trim();
    const metadata = input.metadata.trim();
    const normalizedTitle = this.normalize(title);
    const normalizedText = this.normalize(
      [title, description, eyebrow, metadata, input.searchableText ?? ""].join(" "),
    );
    const data: Prisma.SearchDocumentUncheckedCreateInput = {
      sourceId: input.sourceId.trim(),
      type: input.type,
      title,
      description,
      eyebrow,
      metadata,
      imageUrl: input.imageUrl?.trim() || null,
      imageAlt: input.imageAlt?.trim() || null,
      link: input.link.trim(),
      queryParams: input.queryParams ?? Prisma.JsonNull,
      normalizedTitle,
      normalizedText,
      publishedAt: input.publishedAt,
      active: input.active ?? true,
    };

    return writer.searchDocument.upsert({
      where: { type_sourceId: { type: input.type, sourceId: data.sourceId } },
      create: data,
      update: data,
    });
  }

  async deactivate(
    type: SearchDocumentType,
    sourceId: string,
    writer: SearchDocumentWriter = this.prisma,
  ): Promise<boolean> {
    const result = await writer.searchDocument.updateMany({
      where: { type, sourceId, active: true },
      data: { active: false },
    });
    return result.count > 0;
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
