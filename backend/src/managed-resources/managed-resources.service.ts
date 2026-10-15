import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ManagedResourceStatus,
  Prisma,
  RoleName,
  SearchDocumentType,
  UserStatus,
} from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { PrismaService } from "../prisma/prisma.service";
import { SearchService } from "../search/search.service";
import { UpsertManagedResourceDto } from "./dto/upsert-managed-resource.dto";

@Injectable()
export class ManagedResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
  ) {}

  async listPublished(type?: SearchDocumentType, page = 1, pageSize = 12) {
    const where = {
      status: ManagedResourceStatus.PUBLISHED,
      ...(type ? { type } : {}),
    };
    const [resources, totalItems] = await Promise.all([
      this.prisma.managedResource.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.managedResource.count({ where }),
    ]);
    return {
      items: resources.map((resource) => this.toPublicResource(resource)),
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    };
  }

  async publicState(type?: SearchDocumentType) {
    const [resources, managedCount] = await Promise.all([
      this.publishedResources(type),
      this.prisma.managedResource.count({ where: type ? { type } : undefined }),
    ]);
    return {
      initialized: managedCount > 0,
      items: resources.map((resource) => this.toPublicResource(resource)),
    };
  }

  async adminState(
    actor: AuthenticatedUser,
    type?: SearchDocumentType,
    page = 1,
    limit = 20,
  ) {
    const user = await this.activeUser(actor.id);
    if (user.role.name !== RoleName.ADMIN) {
      throw new ForbiddenException("Chỉ Admin được xem kho nội dung quản trị.");
    }
    const where = type ? { type } : undefined;
    const [resources, total] = await Promise.all([
      this.prisma.managedResource.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.managedResource.count({ where }),
    ]);
    return {
      initialized: total > 0,
      items: resources.map((resource) => this.toPublicResource(resource)),
      total,
      page,
      limit,
    };
  }

  async mine(actor: AuthenticatedUser, type?: SearchDocumentType) {
    await this.activeUser(actor.id);
    if (type && type !== SearchDocumentType.SUPPORT_PROGRAM) {
      throw new ForbiddenException("Chỉ hỗ trợ đọc chương trình thuộc tài khoản hiện tại.");
    }
    const resources = await this.prisma.managedResource.findMany({
      where: { type: SearchDocumentType.SUPPORT_PROGRAM },
      orderBy: [{ updatedAt: "desc" }],
    });
    const mine = resources.filter((resource) => {
      const payload = resource.payload;
      return (
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        payload["ownerId"] === actor.id
      );
    });
    return {
      initialized: mine.length > 0,
      items: mine.map((resource) => this.toPublicResource(resource)),
    };
  }

  private publishedResources(type?: SearchDocumentType) {
    return this.prisma.managedResource.findMany({
      where: {
        status: ManagedResourceStatus.PUBLISHED,
        ...(type ? { type } : {}),
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    });
  }

  private toPublicResource(resource: {
    sourceId: string;
    type: SearchDocumentType;
    status: ManagedResourceStatus;
    title: string;
    description: string;
    payload: Prisma.JsonValue;
    publishedAt: Date;
    updatedAt: Date;
  }) {
    return {
      sourceId: resource.sourceId,
      type: resource.type,
      status: resource.status,
      title: resource.title,
      description: resource.description,
      payload: resource.payload,
      publishedAt: resource.publishedAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
    };
  }

  async upsert(
    actor: AuthenticatedUser,
    type: SearchDocumentType,
    sourceId: string,
    dto: UpsertManagedResourceDto,
  ) {
    await this.assertCanWrite(actor, type, dto);
    const normalizedSourceId = sourceId.trim();
    const publishedAt = new Date(dto.publishedAt);

    return this.prisma.$transaction(async (transaction) => {
      const resource = await transaction.managedResource.upsert({
        where: { type_sourceId: { type, sourceId: normalizedSourceId } },
        create: {
          sourceId: normalizedSourceId,
          type,
          status: dto.status,
          title: dto.title.trim(),
          description: dto.description.trim(),
          payload: dto.payload as Prisma.InputJsonValue,
          publishedAt,
        },
        update: {
          status: dto.status,
          title: dto.title.trim(),
          description: dto.description.trim(),
          payload: dto.payload as Prisma.InputJsonValue,
          publishedAt,
        },
      });

      if (dto.status === ManagedResourceStatus.PUBLISHED) {
        await this.search.upsert(
          {
            sourceId: normalizedSourceId,
            type,
            title: dto.title,
            description: dto.description,
            eyebrow: dto.eyebrow,
            metadata: dto.metadata,
            imageUrl: dto.imageUrl,
            imageAlt: dto.imageAlt,
            link: dto.link,
            searchableText: this.searchablePayload(dto.payload),
            publishedAt,
            active: true,
          },
          transaction,
        );
      } else {
        await this.search.deactivate(type, normalizedSourceId, transaction);
      }

      return {
        sourceId: resource.sourceId,
        type: resource.type,
        status: resource.status,
        updatedAt: resource.updatedAt.toISOString(),
      };
    });
  }

  async remove(
    actor: AuthenticatedUser,
    type: SearchDocumentType,
    sourceId: string,
  ): Promise<void> {
    const resource = await this.prisma.managedResource.findUnique({
      where: { type_sourceId: { type, sourceId } },
    });
    if (!resource)
      throw new NotFoundException("Không tìm thấy nội dung đồng bộ.");
    await this.assertCanDelete(actor, resource.type, resource.payload);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.managedResource.delete({ where: { id: resource.id } });
      await this.search.deactivate(type, sourceId, transaction);
    });
  }

  private async assertCanWrite(
    actor: AuthenticatedUser,
    type: SearchDocumentType,
    dto: UpsertManagedResourceDto,
  ): Promise<void> {
    const user = await this.activeUser(actor.id);
    const isAdmin = user.role.name === RoleName.ADMIN;
    if (type !== SearchDocumentType.SUPPORT_PROGRAM) {
      if (!isAdmin)
        throw new ForbiddenException("Chỉ Admin được đồng bộ nội dung này.");
      return;
    }

    if (isAdmin) return;
    const isPartner =
      actor.role === RoleName.PARTNER || Boolean(user.partnerMembership);
    const ownerId = dto.payload["ownerId"];
    if (
      !isPartner ||
      ownerId !== actor.id ||
      dto.status === ManagedResourceStatus.PUBLISHED
    ) {
      throw new ForbiddenException(
        "Bạn không có quyền cập nhật chương trình này.",
      );
    }
  }

  private async assertCanDelete(
    actor: AuthenticatedUser,
    type: SearchDocumentType,
    payload: Prisma.JsonValue,
  ): Promise<void> {
    const user = await this.activeUser(actor.id);
    if (user.role.name === RoleName.ADMIN) return;
    const ownerId =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload["ownerId"]
        : null;
    if (
      type !== SearchDocumentType.SUPPORT_PROGRAM ||
      !user.partnerMembership ||
      ownerId !== actor.id
    ) {
      throw new ForbiddenException("Bạn không có quyền xóa nội dung này.");
    }
  }

  private async activeUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, partnerMembership: true },
    });
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        "Tài khoản không có quyền đồng bộ nội dung.",
      );
    }
    return user;
  }

  private searchablePayload(payload: Record<string, unknown>): string {
    return Object.values(payload)
      .flatMap((value) => {
        if (typeof value === "string") return value;
        if (Array.isArray(value))
          return value.filter((item) => typeof item === "string");
        return [];
      })
      .join(" ")
      .slice(0, 10_000);
  }
}
