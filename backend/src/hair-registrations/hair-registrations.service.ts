import { randomBytes } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  HairRegistrationMode,
  HairRegistrationStatus,
  NotificationKind,
  Prisma,
  RoleName,
} from "@prisma/client";

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateHairRegistrationDto } from "./dto/create-hair-registration.dto";
import { ListHairRegistrationsDto } from "./dto/list-hair-registrations.dto";
import { ReviewHairRegistrationDto } from "./dto/review-hair-registration.dto";

export interface HairRegistrationReceipt {
  readonly id: string;
  readonly status: "PENDING";
  readonly submittedAt: string;
}

@Injectable()
export class HairRegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(
    dto: CreateHairRegistrationDto,
    actor: AuthenticatedUser,
  ): Promise<HairRegistrationReceipt> {
    const registration = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.hairRegistration.create({
        data: {
          reference: this.createReference(),
          userId: actor.id,
          mode: dto.mode === "receive" ? HairRegistrationMode.RECEIVE : HairRegistrationMode.DONATE,
          fullName: dto.fullName,
          phone: dto.phone,
          email: dto.email,
          province: dto.province,
          district: dto.district,
          address: dto.address,
          gender: dto.gender,
          relativePhone: dto.relativePhone,
          relativeName: dto.relativeName,
          duration: dto.duration,
          hospital: dto.hospital,
          diagnosis: dto.diagnosis,
          borrowDate: dto.borrowDate ? new Date(`${dto.borrowDate}T00:00:00.000Z`) : undefined,
          desiredLength: dto.desiredLength,
          transparency: dto.transparency,
          donationLocation: dto.donationLocation,
          donatedLength: dto.donatedLength,
          acceptedCommitments: dto.acceptedCommitments ?? [],
        },
        select: { id: true, reference: true, createdAt: true },
      });
      await this.notifications.create(
        {
          recipientId: actor.id,
          kind: NotificationKind.HAIR_REGISTRATION_SENT,
          title: `Đã nhận đăng ký ${this.modeLabel(dto.mode === "receive" ? HairRegistrationMode.RECEIVE : HairRegistrationMode.DONATE)}`,
          message: `Hồ sơ ${created.reference} đã được tiếp nhận và đang chờ xét duyệt.`,
          link: this.lookupLink(created.reference),
          dedupeKey: `hair-registration:${created.id}:sent`,
        },
        transaction,
      );
      return created;
    });

    return {
      id: registration.reference,
      status: "PENDING",
      submittedAt: registration.createdAt.toISOString(),
    };
  }

  async listForAdmin(actor: AuthenticatedUser, query: ListHairRegistrationsDto) {
    this.assertAdmin(actor);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const term = query.q?.trim();
    const where: Prisma.HairRegistrationWhereInput = {
      ...(query.mode ? { mode: query.mode } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(term
        ? {
            OR: ["reference", "fullName", "phone", "province", "district"].map((field) => ({
              [field]: { contains: term, mode: "insensitive" },
            })),
          }
        : {}),
    };
    const statuses = Object.values(HairRegistrationStatus);
    const [[items, total], counts] = await Promise.all([
      this.prisma.$transaction([
        this.prisma.hairRegistration.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            reference: true,
            mode: true,
            status: true,
            fullName: true,
            phone: true,
            province: true,
            district: true,
            createdAt: true,
          },
        }),
        this.prisma.hairRegistration.count({ where }),
      ]),
      Promise.all(
        statuses.map((status) =>
          this.prisma.hairRegistration.count({
            where: { status, ...(query.mode ? { mode: query.mode } : {}) },
          }),
        ),
      ),
    ]);
    const summary = Object.fromEntries(
      statuses.map((status, index) => [status, counts[index]]),
    ) as Record<HairRegistrationStatus, number>;
    return { items, total, page, limit, summary };
  }

  async lookupForOwner(actor: AuthenticatedUser, reference: string) {
    const normalized = reference.trim().toUpperCase();
    if (!/^TK-\d{8}-[A-F0-9]{8}$/.test(normalized)) {
      throw new NotFoundException("Không tìm thấy mã đăng ký trong tài khoản này.");
    }

    const registration = await this.prisma.hairRegistration.findFirst({
      where: { reference: normalized, userId: actor.id },
      select: {
        id: true,
        reference: true,
        mode: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!registration) {
      throw new NotFoundException("Không tìm thấy mã đăng ký trong tài khoản này.");
    }

    const rejection =
      registration.status === HairRegistrationStatus.REJECTED
        ? await this.prisma.auditLog.findFirst({
            where: {
              entityType: "HAIR_REGISTRATION",
              entityId: registration.id,
              action: "REVIEW_HAIR_REGISTRATION",
            },
            orderBy: { occurredAt: "desc" },
            select: { reason: true },
          })
        : null;

    return {
      reference: registration.reference,
      mode: registration.mode,
      status: registration.status,
      submittedAt: registration.createdAt,
      updatedAt: registration.updatedAt,
      rejectionReason: rejection?.reason ?? null,
    };
  }

  async detailForAdmin(actor: AuthenticatedUser, id: string) {
    this.assertAdmin(actor);
    const registration = await this.prisma.hairRegistration.findUnique({
      where: { id },
    });
    if (!registration) throw new NotFoundException("Không tìm thấy hồ sơ hiến/nhận tóc.");
    const history = await this.prisma.auditLog.findMany({
      where: { entityType: "HAIR_REGISTRATION", entityId: id },
      orderBy: { occurredAt: "desc" },
      select: {
        id: true,
        actorId: true,
        action: true,
        before: true,
        after: true,
        reason: true,
        occurredAt: true,
      },
    });
    return { ...registration, history };
  }

  async reviewForAdmin(actor: AuthenticatedUser, id: string, dto: ReviewHairRegistrationDto) {
    this.assertAdmin(actor);
    const reason = dto.reason?.trim() ?? "";
    if (dto.status === HairRegistrationStatus.REJECTED && reason.length < 10) {
      throw new BadRequestException("Lý do từ chối cần ít nhất 10 ký tự.");
    }
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.hairRegistration.findUnique({
        where: { id },
      });
      if (!existing) throw new NotFoundException("Không tìm thấy hồ sơ hiến/nhận tóc.");
      const allowed =
        (existing.status === HairRegistrationStatus.PENDING &&
          (dto.status === HairRegistrationStatus.APPROVED ||
            dto.status === HairRegistrationStatus.REJECTED)) ||
        (existing.status === HairRegistrationStatus.APPROVED &&
          dto.status === HairRegistrationStatus.COMPLETED);
      if (!allowed)
        throw new ConflictException("Trạng thái hồ sơ đã thay đổi hoặc thao tác không hợp lệ.");

      const updated = await transaction.hairRegistration.updateMany({
        where: { id, status: existing.status },
        data: { status: dto.status },
      });
      if (updated.count !== 1) throw new ConflictException("Hồ sơ đã thay đổi. Vui lòng tải lại.");
      await transaction.auditLog.create({
        data: {
          actorType: "USER",
          actorId: actor.id,
          action: "REVIEW_HAIR_REGISTRATION",
          entityType: "HAIR_REGISTRATION",
          entityId: id,
          correlationId: randomBytes(16).toString("hex"),
          before: { status: existing.status },
          after: { status: dto.status },
          reason: reason || null,
        },
      });
      if (existing.userId) {
        await this.notifications.create(
          this.reviewNotification(existing, dto.status, reason),
          transaction,
        );
      }
      return transaction.hairRegistration.findUniqueOrThrow({ where: { id } });
    });
  }

  private reviewNotification(
    registration: {
      id: string;
      userId: string | null;
      reference: string;
      mode: HairRegistrationMode;
    },
    status: HairRegistrationStatus,
    reason: string,
  ) {
    const mode = this.modeLabel(registration.mode);
    const notificationsByStatus: Partial<
      Record<HairRegistrationStatus, { kind: NotificationKind; title: string; message: string }>
    > = {
      [HairRegistrationStatus.APPROVED]: {
        kind: NotificationKind.HAIR_REGISTRATION_APPROVED,
        title: `Hồ sơ ${mode} đã được duyệt`,
        message: `Hồ sơ ${registration.reference} đã được chấp thuận. Vui lòng chờ Trạm K liên hệ về bước tiếp theo.`,
      },
      [HairRegistrationStatus.REJECTED]: {
        kind: NotificationKind.HAIR_REGISTRATION_REJECTED,
        title: `Hồ sơ ${mode} chưa được duyệt`,
        message: `Hồ sơ ${registration.reference} chưa được chấp thuận. Lý do: ${reason} Bạn có thể kiểm tra và gửi hồ sơ mới nếu cần.`,
      },
      [HairRegistrationStatus.COMPLETED]: {
        kind: NotificationKind.HAIR_REGISTRATION_COMPLETED,
        title: `Hồ sơ ${mode} đã hoàn tất`,
        message: `Hồ sơ ${registration.reference} đã được cập nhật là hoàn tất.`,
      },
    };
    const notificationByStatus = notificationsByStatus[status];
    if (!notificationByStatus || !registration.userId) {
      throw new BadRequestException("Trạng thái thông báo không hợp lệ.");
    }
    return {
      recipientId: registration.userId,
      ...notificationByStatus,
      link: this.lookupLink(registration.reference),
      dedupeKey: `hair-registration:${registration.id}:${status.toLowerCase()}`,
    };
  }

  private modeLabel(mode: HairRegistrationMode): string {
    return mode === HairRegistrationMode.RECEIVE ? "nhận tóc" : "hiến tóc";
  }

  private lookupLink(reference: string): string {
    return `/tra-cuu-ma?ma=${encodeURIComponent(reference)}`;
  }

  private assertAdmin(actor: AuthenticatedUser): void {
    if (actor.role !== RoleName.ADMIN) {
      throw new ForbiddenException("Chỉ quản trị viên được quản lý hồ sơ hiến/nhận tóc.");
    }
  }

  private createReference(): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const suffix = randomBytes(4).toString("hex").toUpperCase();
    return `TK-${date}-${suffix}`;
  }
}
