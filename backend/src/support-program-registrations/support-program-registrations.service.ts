import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ManagedResourceStatus,
  NotificationKind,
  Prisma,
  ProgramStatus,
  RoleName,
  SearchDocumentType,
  SupportProgramRegistrationStatus,
  UserStatus,
  PartnerStatus,
} from "@prisma/client";
import { randomUUID } from 'node:crypto';

import { AuthenticatedUser } from "../auth/auth-user.interface";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { parseStructuredSupportSchedule, scheduleHasUpcomingOccurrence } from "../search/support-schedule";
import { UpdateSupportProgramRegistrationDto } from "./dto/update-support-program-registration.dto";

@Injectable()
export class SupportProgramRegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) { }

  async mine(actor: AuthenticatedUser) {
    await this.activeUser(actor.id);
    return this.prisma.supportProgramRegistration.findMany({
      where: { userId: actor.id },
      include: { program: true },
      orderBy: [{ registeredAt: "desc" }],
    });
  }

  async forProgram(actor: AuthenticatedUser, programId: string) {
    await this.assertProgramManager(actor, programId);
    return this.prisma.supportProgramRegistration.findMany({
      where: { programId },
      orderBy: [{ registeredAt: "desc" }],
    });
  }

  async register(actor: AuthenticatedUser, programId: string) {
    const user = await this.activeUser(actor.id);
    if (user.role.name !== RoleName.PATIENT && user.role.name !== RoleName.CARER) {
      throw new ForbiddenException("Chỉ bệnh nhân và người nhà bệnh nhân có thể đăng ký.");
    }
    const now = new Date();

    return this.prisma.$transaction(async (transaction) => {
      await this.syncPublishedManagedProgram(transaction, programId);

      // 1. Khóa bảng Program để chống tranh chấp (Race Condition)
      const programs = await transaction.$queryRaw<any[]>`
        SELECT * FROM "programs"
        WHERE id = ${programId}
        FOR UPDATE
      `;
      const program = programs[0];

      if (!program || program.status !== ProgramStatus.PUBLISHED || program.deleted_at !== null) {
        throw new NotFoundException("Chương trình không còn tiếp nhận đăng ký.");
      }
      if (now < new Date(program.registration_open_at) || now >= new Date(program.registration_close_at)) {
        throw new BadRequestException("Chương trình không trong thời gian đăng ký");
      }

      const existing = await transaction.supportProgramRegistration.findUnique({
        where: { programId_userId: { programId, userId: actor.id } },
      });
      if (existing && existing.status !== SupportProgramRegistrationStatus.CANCELLED) {
        throw new ConflictException("Bạn đã đăng ký chương trình này.");
      }

      // 2. Đếm số lượng CONFIRMED hiện tại
      const occupied = await transaction.supportProgramRegistration.count({
        where: { programId, status: SupportProgramRegistrationStatus.CONFIRMED },
      });

      const isFull = occupied >= program.capacity;
      const newStatus = isFull
        ? SupportProgramRegistrationStatus.WAITLISTED
        : SupportProgramRegistrationStatus.CONFIRMED;

      const registration = existing
        ? await transaction.supportProgramRegistration.update({
          where: { id: existing.id },
          data: {
            status: newStatus,
            registeredAt: now,
            confirmedAt: isFull ? null : now,
            waitlistedAt: isFull ? now : null,
            cancelledAt: null,
            cancelReason: null,
            version: { increment: 1 },
          },
        })
        : await transaction.supportProgramRegistration.create({
          data: {
            programId,
            userId: actor.id,
            applicantName: user.fullName,
            applicantEmail: user.email,
            status: newStatus,
            confirmedAt: isFull ? null : now,
            waitlistedAt: isFull ? now : null,
          },
        });

      await transaction.registrationStatusHistory.create({
        data: {
          registrationId: registration.id,
          fromStatus: existing ? SupportProgramRegistrationStatus.CANCELLED : null,
          toStatus: newStatus,
          reason: existing ? "Đăng ký lại sau khi hủy" : "Đăng ký mới",
          actorId: actor.id,
        },
      });

      await transaction.outboxEvent.create({
        data: {
          eventId: randomUUID(),
          type: "PROGRAM_REGISTRATION_SENT",
          aggregateType: "SupportProgramRegistration",
          aggregateId: registration.id,
          payload: {
            recipientId: actor.id,
            programId: programId,
            programTitle: program.title,
            status: newStatus,
            registrationVersion: registration.version,
          },
        },
      });

      return registration;
    });
  }

  async cancel(actor: AuthenticatedUser, programId: string) {
    const now = new Date();

    return this.prisma.$transaction(async (transaction) => {
      const registration = await transaction.supportProgramRegistration.findUnique({
        where: { programId_userId: { programId, userId: actor.id } },
      });
      if (!registration) throw new NotFoundException("Không tìm thấy đăng ký.");

      const program = await transaction.program.findUnique({ where: { id: programId } });
      if (!program) throw new NotFoundException("Không tìm thấy chương trình.");

      if (now >= program.startAt) {
        throw new BadRequestException("Không thể hủy đăng ký sau khi chương trình đã bắt đầu.")
      }

      const updated = await transaction.supportProgramRegistration.update({
        where: { id: registration.id, version: registration.version },
        data: {
          status: SupportProgramRegistrationStatus.CANCELLED,
          cancelledAt: now,
          cancelReason: "Người dùng tự hủy",
          version: { increment: 1 },
        },
      });

      await transaction.registrationStatusHistory.create({
        data: {
          registrationId: registration.id,
          fromStatus: registration.status,
          toStatus: SupportProgramRegistrationStatus.CANCELLED,
          reason: "Người dùng tự hủy",
          actorId: actor.id,
        },
      });

      // Đôn người từ Waitlist lên nếu còn chỗ và trước giờ đóng đăng ký
      if (
        registration.status === SupportProgramRegistrationStatus.CONFIRMED &&
        now < program.registrationCloseAt
      ) {
        const waitlisted = await transaction.supportProgramRegistration.findFirst({
          where: { programId, status: SupportProgramRegistrationStatus.WAITLISTED },
          orderBy: [{ waitlistedAt: "asc" }, { id: "asc" }],
        });

        if (waitlisted) {
          const updatedWaitlisted = await transaction.supportProgramRegistration.update({
            where: { id: waitlisted.id },
            data: {
              status: SupportProgramRegistrationStatus.CONFIRMED,
              confirmedAt: now,
              waitlistedAt: null,
              version: { increment: 1 },
            },
          });

          await transaction.registrationStatusHistory.create({
            data: {
              registrationId: waitlisted.id,
              fromStatus: SupportProgramRegistrationStatus.WAITLISTED,
              toStatus: SupportProgramRegistrationStatus.CONFIRMED,
              reason: "Tự động đôn từ danh sách chờ do có người hủy.",
              actorId: null,
            },
          });

          await transaction.outboxEvent.create({
            data: {
              eventId: randomUUID(),
              type: "PROGRAM_REGISTRATION_CONFIRMED",
              aggregateType: "SupportProgramRegistration",
              aggregateId: waitlisted.id,
              payload: {
                recipientId: waitlisted.userId,
                programId: programId,
                programTitle: program.title,
                registrationVersion: updatedWaitlisted.version,
              },
            },
          });
        }
      }

      return updated;
    });
  }

  async update(
    actor: AuthenticatedUser,
    programId: string,
    userId: string,
    dto: UpdateSupportProgramRegistrationDto,
  ) {
    const program = await this.assertProgramManager(actor, programId);
    const registration = await this.prisma.supportProgramRegistration.findUnique({
      where: { programId_userId: { programId, userId } },
    });
    if (!registration) throw new NotFoundException("Không tìm thấy đăng ký.");

    const now = new Date();

    if (program.status !== ProgramStatus.COMPLETED) {
      if (now < program.startAt) {
        throw new BadRequestException("Chương trình chưa bắt đầu, không thể điểm danh");
      }
      if (registration.status !== SupportProgramRegistrationStatus.CONFIRMED) {
        throw new BadRequestException("Chỉ có thể điểm danh người đã CONFIRMED");
      }
    } else {
      if (
        (registration.status !== SupportProgramRegistrationStatus.ATTENDED &&
          registration.status !== SupportProgramRegistrationStatus.NO_SHOW) ||
        (dto.status !== SupportProgramRegistrationStatus.ATTENDED &&
          dto.status !== SupportProgramRegistrationStatus.NO_SHOW)
      ) {
        throw new BadRequestException("Chỉ được sửa qua lại giữa ATTENDED và NO_SHOW sau khi chương trình kết thúc.");
      }
    }

    if (dto.status === SupportProgramRegistrationStatus.NO_SHOW && !dto.decisionReason) {
      throw new BadRequestException("Vui lòng nhập lý do vắng mặt");
    }

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.supportProgramRegistration.update({
        where: { id: registration.id, version: registration.version },
        data: {
          status: dto.status,
          attendedAt: dto.status === SupportProgramRegistrationStatus.ATTENDED ? now : null,
          decisionReason: dto.decisionReason,
          version: { increment: 1 },
        },
      });

      await transaction.registrationStatusHistory.create({
        data: {
          registrationId: registration.id,
          fromStatus: registration.status,
          toStatus: dto.status,
          reason: dto.decisionReason || "Điểm danh",
          actorId: actor.id,
        },
      });

      await transaction.auditLog.create({
        data: {
          actorType: "USER",
          actorId: actor.id,
          action: "UPDATE_REGISTRATION_ATTENDANCE",
          entityType: "SUPPORT_PROGRAM_REGISTRATION",
          entityId: registration.id,
          before: { status: registration.status },
          after: { status: dto.status },
          reason: dto.decisionReason || "Điểm danh",
          correlationId: randomUUID(),
        },
      });
      return updated;
    });
  }

  private async assertProgramManager(actor: AuthenticatedUser, programId: string) {
    const user = await this.activeUser(actor.id);
    await this.syncPublishedManagedProgram(this.prisma, programId);
    const program = await this.prisma.program.findUnique({
      where: { id: programId },
    });
    if (!program) throw new NotFoundException("Không tìm thấy chương trình.");

    if (user.role.name === RoleName.ADMIN) return program;

    if (
      !user.partnerMembership ||
      user.partnerMembership.status !== PartnerStatus.ACTIVE ||
      program.ownerPartnerId !== user.partnerMembership.id
    ) {
      throw new ForbiddenException("Bạn không có quyền quản lý đăng ký của chương trình này.");
    }
    return program;
  }

  private async syncPublishedManagedProgram(
    client: Pick<Prisma.TransactionClient, "managedResource" | "program" | "user">,
    programId: string,
  ): Promise<void> {
    const resource = await client.managedResource.findUnique({
      where: {
        type_sourceId: {
          type: SearchDocumentType.SUPPORT_PROGRAM,
          sourceId: programId,
        },
      },
    });
    if (!resource || resource.status !== ManagedResourceStatus.PUBLISHED) return;
    if (!resource.payload || typeof resource.payload !== "object" || Array.isArray(resource.payload)) {
      return;
    }

    const payload = resource.payload as Record<string, unknown>;
    const schedule = parseStructuredSupportSchedule(payload);
    const ownerId = payload["ownerId"];
    if (!schedule || typeof ownerId !== "string" || !ownerId) return;

    const owner = await client.user.findUnique({
      where: { id: ownerId },
      select: {
        partnerMembership: { select: { id: true, status: true } },
      },
    });
    if (!owner?.partnerMembership || owner.partnerMembership.status !== PartnerStatus.ACTIVE) return;

    const startAt = this.vietnamDateTime(schedule.startsOn, schedule.startTime);
    const endAt = this.vietnamDateTime(
      schedule.scheduleType === "WEEKLY" ? (schedule.endsOn ?? schedule.startsOn) : schedule.startsOn,
      schedule.endTime,
    );
    if (!startAt || !endAt || endAt <= startAt) return;

    const capacity = payload["capacity"];
    const latitude = payload["latitude"];
    const longitude = payload["longitude"];
    const eligibilityNote = payload["eligibilityNote"];
    const registrationOpenAt = resource.createdAt < endAt
      ? resource.createdAt
      : new Date(endAt.getTime() - 1);

    await client.program.upsert({
      where: { id: programId },
      create: {
        id: programId,
        ownerPartnerId: owner.partnerMembership.id,
        title: resource.title,
        description: resource.description,
        address: typeof payload["address"] === "string" ? payload["address"] : "Chưa cập nhật",
        latitude: typeof latitude === "number" && Number.isFinite(latitude) ? latitude : 0,
        longitude: typeof longitude === "number" && Number.isFinite(longitude) ? longitude : 0,
        conditions: typeof eligibilityNote === "string" && eligibilityNote.trim()
          ? eligibilityNote.trim()
          : null,
        registrationOpenAt,
        registrationCloseAt: endAt,
        startAt,
        endAt,
        capacity: typeof capacity === "number" && Number.isInteger(capacity) && capacity > 0
          ? capacity
          : 1,
        status: ProgramStatus.PUBLISHED,
        publishedAt: resource.publishedAt,
      },
      update: {
        ownerPartnerId: owner.partnerMembership.id,
        title: resource.title,
        description: resource.description,
        address: typeof payload["address"] === "string" ? payload["address"] : "Chưa cập nhật",
        latitude: typeof latitude === "number" && Number.isFinite(latitude) ? latitude : 0,
        longitude: typeof longitude === "number" && Number.isFinite(longitude) ? longitude : 0,
        conditions: typeof eligibilityNote === "string" && eligibilityNote.trim()
          ? eligibilityNote.trim()
          : null,
        registrationOpenAt,
        registrationCloseAt: endAt,
        startAt,
        endAt,
        capacity: typeof capacity === "number" && Number.isInteger(capacity) && capacity > 0
          ? capacity
          : 1,
        status: ProgramStatus.PUBLISHED,
        publishedAt: resource.publishedAt,
        deletedAt: null,
        deletedById: null,
      },
    });
  }

  private vietnamDateTime(date: string, time: string): Date | null {
    const value = new Date(`${date}T${time}:00+07:00`);
    return Number.isNaN(value.getTime()) ? null : value;
  }

  private async activeUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, partnerMembership: true },
    });
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException("Tài khoản không hoạt động.");
    }
    return user;
  }
}
