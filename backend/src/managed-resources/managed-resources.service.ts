import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ManagedResourceStatus,
  NotificationKind,
  Prisma,
  RoleName,
  SearchDocumentType,
  UserStatus,
} from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SearchService } from "../search/search.service";
import { parseRecurringLocationSchedule, parseStructuredSupportSchedule,
  scheduleHasUpcomingOccurrence } from "../search/support-schedule";
import { UpsertManagedResourceDto } from "./dto/upsert-managed-resource.dto";

@Injectable()
export class ManagedResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly notifications: NotificationsService,
  ) {}

  async listPublished(type?: SearchDocumentType) {
    const resources = await this.publishedResources(type);
    return resources.map((resource) => this.toPublicResource(resource));
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

  async adminState(actor: AuthenticatedUser, type?: SearchDocumentType) {
    const user = await this.activeUser(actor.id);
    if (user.role.name !== RoleName.ADMIN) {
      throw new ForbiddenException("Chỉ Admin được xem kho nội dung quản trị.");
    }
    const resources = await this.prisma.managedResource.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ updatedAt: "desc" }],
    });
    return {
      initialized: resources.length > 0,
      items: resources.map((resource) => this.toPublicResource(resource)),
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
    if (type === SearchDocumentType.DONATION_LOCATION) {
      this.validateDonationLocationGps(dto.payload);
      if ((dto.payload["weekdays"] || dto.payload["startTime"] || dto.payload["endTime"]) &&
        !parseRecurringLocationSchedule(dto.payload)) {
        throw new BadRequestException("Lịch điểm tiếp nhận cần có thứ trong tuần và giờ bắt đầu, kết thúc hợp lệ.");
      }
    }
    if (type === SearchDocumentType.SUPPORT_PROGRAM && dto.status !== ManagedResourceStatus.REJECTED) {
      this.validateSupportProgramAddress(dto.payload);
      if (dto.status === ManagedResourceStatus.PENDING || dto.payload["scheduleType"]) {
        const schedule = parseStructuredSupportSchedule(dto.payload);
        if (!schedule || !scheduleHasUpcomingOccurrence(schedule)) {
          throw new BadRequestException("Vui lòng chọn ngày, khung giờ và thời hạn hỗ trợ hợp lệ trong tương lai.");
        }
      }
    }
    const normalizedSourceId = sourceId.trim();
    const publishedAt = new Date(dto.publishedAt);

    return this.prisma.$transaction(async (transaction) => {
      const previous = type === SearchDocumentType.SUPPORT_PROGRAM
        ? await transaction.managedResource.findUnique({
          where: { type_sourceId: { type, sourceId: normalizedSourceId } },
          select: { status: true },
        }) : null;
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

      if (type === SearchDocumentType.DONATION_LOCATION) {
        // Map locations are found via their region map, not the article search index.
        await this.search.deactivate(type, normalizedSourceId, transaction);
      } else if (dto.status === ManagedResourceStatus.PUBLISHED) {
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

      if (actor.role === RoleName.ADMIN && type === SearchDocumentType.SUPPORT_PROGRAM &&
        previous?.status === ManagedResourceStatus.PENDING &&
        (dto.status === ManagedResourceStatus.PUBLISHED || dto.status === ManagedResourceStatus.REJECTED)) {
        const ownerId = dto.payload["ownerId"];
        if (typeof ownerId === "string" && ownerId) {
          const approved = dto.status === ManagedResourceStatus.PUBLISHED;
          const reason = typeof dto.payload["reviewReason"] === "string"
            ? dto.payload["reviewReason"].trim() : "";
          await this.notifications.create({
            recipientId: ownerId,
            kind: approved ? NotificationKind.PROGRAM_PUBLISHED : NotificationKind.PROGRAM_REJECTED,
            title: approved ? "Chương trình đã được xuất bản" : "Chương trình cần chỉnh sửa",
            message: approved
              ? `Chương trình “${resource.title}” đã được duyệt và hiển thị công khai.`
              : `Chương trình “${resource.title}” chưa được duyệt.${reason ? ` Lý do: ${reason}` : ""}`,
            link: `/doi-tac/quan-ly-chuong-trinh?program=${encodeURIComponent(normalizedSourceId)}`,
            dedupeKey: `program-review:${normalizedSourceId}:${dto.status}:${resource.updatedAt.getTime()}`,
          }, transaction);
        }
      }

      return {
        sourceId: resource.sourceId,
        type: resource.type,
        status: resource.status,
        updatedAt: resource.updatedAt.toISOString(),
      };
    });
  }

  private validateDonationLocationGps(payload: Record<string, unknown>): void {
    const latitude = payload["latitude"];
    const longitude = payload["longitude"];
    if (typeof latitude !== "number" || !Number.isFinite(latitude)) {
      throw new BadRequestException("Chưa điền vĩ độ GPS hợp lệ.");
    }
    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException("Vĩ độ GPS phải từ -90 đến 90.");
    }
    if (typeof longitude !== "number" || !Number.isFinite(longitude)) {
      throw new BadRequestException("Chưa điền kinh độ GPS hợp lệ.");
    }
    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException("Kinh độ GPS phải từ -180 đến 180.");
    }
  }

  private validateSupportProgramAddress(payload: Record<string, unknown>): void {
    const address = payload["address"];
    if (typeof address !== "string" || !address.trim()) {
      throw new BadRequestException("Vui lòng nhập địa chỉ tổ chức cụ thể.");
    }
    const value = address.trim().replace(/\s+/g, " ");
    if (value.length < 10 || value.length > 250 || !/\S+\s+\S+/.test(value) || /(.)\1{5,}/i.test(value)) {
      throw new BadRequestException("Địa chỉ tổ chức chưa đủ cụ thể hoặc chứa nội dung thử nghiệm.");
    }
  }

  async remove(
    actor: AuthenticatedUser,
    type: SearchDocumentType,
    sourceId: string,
  ): Promise<{ deletedRegistrations: number }> {
    const resource = await this.prisma.managedResource.findUnique({
      where: { type_sourceId: { type, sourceId } },
    });
    if (!resource)
      throw new NotFoundException("Không tìm thấy nội dung đồng bộ.");
    await this.assertCanDelete(actor, resource.type, resource.status, resource.payload);

    return this.prisma.$transaction(async (transaction) => {
      const recipients = type === SearchDocumentType.SUPPORT_PROGRAM
        ? await transaction.supportProgramRegistration.findMany({
          where: { programId: sourceId }, select: { userId: true },
        }) : [];
      const registrations = type === SearchDocumentType.SUPPORT_PROGRAM
        ? await transaction.supportProgramRegistration.deleteMany({ where: { programId: sourceId } })
        : { count: 0 };
      await transaction.managedResource.delete({ where: { id: resource.id } });
      await this.search.deactivate(type, sourceId, transaction);
      if (actor.role === RoleName.ADMIN && type === SearchDocumentType.SUPPORT_PROGRAM) {
        for (const userId of new Set(recipients.map((item) => item.userId))) {
          await this.notifications.create({
            recipientId: userId,
            kind: NotificationKind.PROGRAM_DELETED,
            title: "Chương trình hỗ trợ đã được xóa",
            message: `Chương trình “${resource.title}” đã được Trạm K xóa. Hồ sơ đăng ký của bạn cho chương trình này cũng đã được xóa.`,
            link: "/cong-dong/chuong-trinh-ho-tro",
            dedupeKey: `program-deleted:${sourceId}:${userId}`,
          }, transaction);
        }
      }
      return { deletedRegistrations: registrations.count };
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
    status: ManagedResourceStatus,
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
      status !== ManagedResourceStatus.PENDING ||
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
