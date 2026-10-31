import { Injectable } from "@nestjs/common";
import { ManagedResourceStatus, Prisma, SearchDocumentType, SupportProgramRegistrationStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { SearchQueryDto } from "./dto/search-query.dto";
import { BASELINE_DONATION_LOCATIONS } from "./baseline-donation-locations";
import { parseRecurringLocationSchedule, parseStructuredSupportSchedule, scheduleHasUpcomingOccurrence,
  type RecurringLocationSchedule, type StructuredSupportSchedule } from "./support-schedule";

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

export interface SearchAnswerPassage {
  readonly sourceId: string;
  readonly type: SearchDocumentType;
  readonly passages: readonly string[];
}

export interface PublicSupportOption {
  readonly id: string;
  readonly type: "SUPPORT_PROGRAM" | "DONATION_LOCATION";
  readonly title: string;
  readonly regionId: string;
  readonly city: string;
  readonly address: string;
  readonly schedule: string;
  readonly supportType: string;
  readonly description: string;
  readonly capacityRemaining?: number;
  readonly eligibleAudience?: "PATIENT" | "PATIENT_AND_CAREGIVER" | "ANYONE";
  readonly financialNeedRequired?: boolean;
  readonly eligibilityNote?: string;
  readonly addressNeedsReview?: boolean;
  readonly structuredSchedule?: StructuredSupportSchedule;
  readonly recurringSchedule?: RecurringLocationSchedule;
}

type SearchDocumentWriter = Pick<PrismaService, "searchDocument">;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) { }

  async search(query: SearchQueryDto) {
    const normalizedQuery = this.normalize(query.q);
    const searchesPrograms = !query.type || query.type === SearchDocumentType.SUPPORT_PROGRAM;
    const availableProgramIds = searchesPrograms
      ? await this.publishedUpcomingProgramIds()
      : [];
    const skip = (query.page - 1) * query.pageSize;
    const now = new Date();
    const typeCondition = query.type
      ? Prisma.sql`AND type = ${query.type}::"SearchDocumentType"`
      : Prisma.empty;
    const programCondition = searchesPrograms
      ? query.type === SearchDocumentType.SUPPORT_PROGRAM
        ? (availableProgramIds.length
          ? Prisma.sql`AND source_id IN (${Prisma.join(availableProgramIds)})`
          : Prisma.sql`AND 1 = 0`)
        : (availableProgramIds.length
          ? Prisma.sql`AND (type <> ${SearchDocumentType.SUPPORT_PROGRAM}::"SearchDocumentType" OR source_id IN (${Prisma.join(availableProgramIds)}))`
          : Prisma.sql`AND type <> ${SearchDocumentType.SUPPORT_PROGRAM}::"SearchDocumentType"`)
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT id, source_id as "sourceId", type, title, description, eyebrow, metadata,
        image_url as "imageUrl", image_alt as "imageAlt", link,
        query_params as "queryParams", published_at as "publishedAt",
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
        ${programCondition}
      ORDER BY score DESC, published_at DESC, id DESC
      LIMIT ${query.pageSize}::int OFFSET ${skip}::int;
    `;
    const where: Prisma.SearchDocumentWhereInput = {
      active: true,
      publishedAt: { lte: now },
      ...(query.type ? { type: query.type } : {}),
      normalizedText: { contains: normalizedQuery },
      ...(searchesPrograms ? {
        OR: query.type === SearchDocumentType.SUPPORT_PROGRAM
          ? [{ sourceId: { in: availableProgramIds } }]
          : [
            { type: { not: SearchDocumentType.SUPPORT_PROGRAM } },
            { type: SearchDocumentType.SUPPORT_PROGRAM, sourceId: { in: availableProgramIds } },
          ],
      } : {}),
    };
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

  async publishedPassages(
    sources: readonly { readonly id: string; readonly type: SearchDocumentType }[],
  ): Promise<SearchAnswerPassage[]> {
    if (!sources.length) return [];
    const resources = await this.prisma.managedResource.findMany({
      where: {
        status: "PUBLISHED",
        OR: sources.map(({ id, type }) => ({ sourceId: id, type })),
      },
      select: { sourceId: true, type: true, description: true, payload: true },
    });
    return resources.map((resource) => {
      const payload = resource.payload;
      const detail = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : {};
      const sections = Array.isArray(detail["sections"]) ? detail["sections"] : [];
      const passages = [
        resource.description,
        detail["detailLead"],
        ...sections.flatMap((section) => {
          if (!section || typeof section !== "object" || Array.isArray(section)) return [];
          const item = section as Record<string, unknown>;
          return [item["heading"], ...(Array.isArray(item["paragraphs"]) ? item["paragraphs"] : []),
            ...(Array.isArray(item["bullets"]) ? item["bullets"] : [])];
        }),
      ].filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
      return { sourceId: resource.sourceId, type: resource.type, passages };
    });
  }

  async publishedSupportOptions(): Promise<PublicSupportOption[]> {
    const resources = await this.prisma.managedResource.findMany({
      where: {
        status: ManagedResourceStatus.PUBLISHED,
        type: { in: [SearchDocumentType.SUPPORT_PROGRAM, SearchDocumentType.DONATION_LOCATION] },
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    });
    const programIds = resources
      .filter((resource) => resource.type === SearchDocumentType.SUPPORT_PROGRAM)
      .map((resource) => resource.sourceId);
    const occupied = programIds.length
      ? await this.prisma.supportProgramRegistration.groupBy({
        by: ["programId"],
        where: {
          programId: { in: programIds },
          status: { not: SupportProgramRegistrationStatus.REJECTED },
        },
        _count: { _all: true },
      })
      : [];
    const occupiedByProgram = new Map(occupied.map((item) => [item.programId, item._count._all]));

    const published = resources.flatMap<PublicSupportOption>((resource) => {
      const payload = resource.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
      const regionId = typeof payload["regionId"] === "string" ? payload["regionId"] : "";
      const address = typeof payload["address"] === "string" ? payload["address"] : "";
      const schedule = typeof payload["schedule"] === "string" ? payload["schedule"] : "";
      if (!regionId || !address || !schedule) return [];

      if (resource.type === SearchDocumentType.DONATION_LOCATION) {
        if (payload["status"] !== "ACTIVE") return [];
        return [{
          id: resource.sourceId,
          type: "DONATION_LOCATION" as const,
          title: resource.title,
          regionId,
          city: "",
          address,
          schedule,
          supportType: "MEAL",
          description: resource.description,
          addressNeedsReview: this.addressNeedsReview(address),
          recurringSchedule: parseRecurringLocationSchedule(payload) ?? undefined,
        }];
      }

      if (payload["status"] !== "PUBLISHED") return [];
      const structuredSchedule = parseStructuredSupportSchedule(payload);
      if (!structuredSchedule || !scheduleHasUpcomingOccurrence(structuredSchedule)) return [];
      const capacity = payload["capacity"];
      const remaining = typeof capacity === "number" && Number.isFinite(capacity)
        ? capacity - (occupiedByProgram.get(resource.sourceId) ?? 0)
        : 0;
      if (remaining <= 0) return [];
      return [{
        id: resource.sourceId,
        type: "SUPPORT_PROGRAM" as const,
        title: resource.title,
        regionId,
        city: typeof payload["city"] === "string" ? payload["city"] : "",
        address,
        schedule,
        supportType: typeof payload["supportType"] === "string" ? payload["supportType"] : "OTHER",
        description: resource.description,
        capacityRemaining: remaining,
        addressNeedsReview: this.addressNeedsReview(address),
        structuredSchedule: structuredSchedule ?? undefined,
        eligibleAudience: ["PATIENT", "PATIENT_AND_CAREGIVER", "ANYONE"].includes(String(payload["eligibleAudience"]))
          ? payload["eligibleAudience"] as PublicSupportOption["eligibleAudience"] : undefined,
        financialNeedRequired: payload["financialNeedRequired"] === true,
        eligibilityNote: typeof payload["eligibilityNote"] === "string" ? payload["eligibilityNote"] : undefined,
      }];
    });
    const managedLocationIds = new Set(resources
      .filter((resource) => resource.type === SearchDocumentType.DONATION_LOCATION)
      .map((resource) => resource.sourceId));
    return [...published, ...BASELINE_DONATION_LOCATIONS.filter((item) => !managedLocationIds.has(item.id))];
  }

  private async publishedUpcomingProgramIds(): Promise<string[]> {
    const resources = await this.prisma.managedResource.findMany({
      where: { type: SearchDocumentType.SUPPORT_PROGRAM, status: ManagedResourceStatus.PUBLISHED },
      select: { sourceId: true, payload: true },
    });
    return resources.flatMap((resource) => {
      const payload = resource.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
        payload["status"] !== "PUBLISHED") return [];
      const schedule = parseStructuredSupportSchedule(payload);
      return schedule && scheduleHasUpcomingOccurrence(schedule) ? [resource.sourceId] : [];
    });
  }

  private addressNeedsReview(address: string): boolean {
    const value = address.trim().replace(/\s+/g, " ");
    return value.length < 10 || !/\S+\s+\S+/.test(value) || /(.)\1{5,}/i.test(value);
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
