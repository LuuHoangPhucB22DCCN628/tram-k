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
    const program = await this.publishedProgram(programId);
    const payload = await this.programPayload(program.payload);

    const now = new Date();
    if (now < new Date(payload.registrationOpenAt) || now >= new Date(payload.registrationCloseAt)) {
      throw new BadRequestException("Chương trình không trong thời gian đăng ký")
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT id FROM "managed_resources"
        WHERE "source_id" = ${programId} AND "type" = 'SUPPORT_PROGRAM'::"SearchDocumentType"
        FOR UPDATE
        `;

      const existing = await transaction.supportProgramRegistration.findUnique({
        where: { programId_userId: { programId, userId: actor.id } },
      });
      if (existing && existing.status !== SupportProgramRegistrationStatus.CANCELLED) {
        throw new ConflictException("Bạn đã đăng ký chương trình này.");
      }


      const occupied = await transaction.supportProgramRegistration.count({
        where: {
          programId,
          status: SupportProgramRegistrationStatus.CONFIRMED,
        },
      });

      const isFull = occupied >= payload.capacity;
      const newStatus = isFull
        ? SupportProgramRegistrationStatus.WAITLISTED
        : SupportProgramRegistrationStatus.CONFIRMED;


      let actionReason = existing ? "Đăng ký lại sau khi hủy" : "Đăng ký mới";

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
          reason: actionReason,
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
    const registration = await this.prisma.supportProgramRegistration.findUnique({
      where: { programId_userId: { programId, userId: actor.id } },
    });
    if (!registration) throw new NotFoundException("Không tìm thấy đăng ký.");

    const program = await this.prisma.managedResource.findUnique({
      where: { type_sourceId: { type: SearchDocumentType.SUPPORT_PROGRAM, sourceId: programId } }
    });
    if (!program) throw new NotFoundException("Không tìm thấy chương trình.");

    if (
      registration.status !== SupportProgramRegistrationStatus.CONFIRMED &&
      registration.status !== SupportProgramRegistrationStatus.WAITLISTED
    ) {
      throw new BadRequestException("Không thể hủy đăng ký ở trạng thái hiện tại.");
    }

    const payload = this.programPayload(program.payload);
    const now = new Date();
    if (now >= new Date(payload.startAt)) {
      throw new BadRequestException("Không thể hủy đăng ký sau khi chương trình đã bắt đầu.")
    }

    return this.prisma.$transaction(async (transaction) => {
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

      if (
        registration.status === SupportProgramRegistrationStatus.CONFIRMED &&
        now < new Date(payload.registrationCloseAt)
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

    const payload = this.programPayload(program.payload);
    const now = new Date();

    const isCompleted = payload.status === "COMPLETED";
    if (!isCompleted) {
      if (now < new Date(payload.startAt)) {
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

  private statusNotification(
    title: string,
    programId: string,
    userId: string,
    status: SupportProgramRegistrationStatus,
    reason?: string,
  ) {
    const values = {
      CONFIRMED: {
        kind: NotificationKind.PROGRAM_REGISTRATION_CONFIRMED,
        title: "Đăng ký đã được xác nhận",
        message: `Bạn đã được xác nhận tham gia chương trình “${title}”.`,
      },
      REJECTED: {
        kind: NotificationKind.PROGRAM_REGISTRATION_REJECTED,
        title: "Đăng ký chưa được chấp thuận",
        message: `Chương trình “${title}” chưa thể tiếp nhận đăng ký của bạn. Lý do: ${reason}`,
      },
      COMPLETED: {
        kind: NotificationKind.PROGRAM_REGISTRATION_COMPLETED,
        title: "Chương trình hỗ trợ đã hoàn thành",
        message: `Trạng thái tham gia chương trình “${title}” đã được cập nhật hoàn thành.`,
      },
    } as const;
    const value = values[status as keyof typeof values];
    if (!value) throw new BadRequestException("Trạng thái không được hỗ trợ.");
    return {
      recipientId: userId,
      ...value,
      link: `/thanh-vien/chuong-trinh-da-dang-ky?program=${encodeURIComponent(programId)}`,
      dedupeKey: `program-registration:${programId}:${userId}:${status.toLowerCase()}`,
    };
  }

  private async assertProgramManager(actor: AuthenticatedUser, programId: string) {
    const user = await this.activeUser(actor.id);
    const program = await this.prisma.managedResource.findUnique({
      where: { type_sourceId: { type: SearchDocumentType.SUPPORT_PROGRAM, sourceId: programId } },
    });
    if (!program) throw new NotFoundException("Không tìm thấy chương trình.");
    const payload = this.programPayload(program.payload);

    if (user.role.name === RoleName.ADMIN) {
      return program;
    }

    if (
      !user.partnerMembership ||
      user.partnerMembership.status !== PartnerStatus.ACTIVE ||
      payload.ownerId !== actor.id
    ) {
      throw new ForbiddenException("Bạn không có quyền quản lý đăng ký của chương trình này.");
    }
    return program;
  }

  private async publishedProgram(programId: string) {
    const program = await this.prisma.managedResource.findUnique({
      where: { type_sourceId: { type: SearchDocumentType.SUPPORT_PROGRAM, sourceId: programId } },
    });
    if (!program || program.status !== ManagedResourceStatus.PUBLISHED) {
      throw new NotFoundException("Chương trình không còn tiếp nhận đăng ký.");
    }
    return program;
  }

  private programPayload(payload: Prisma.JsonValue): Record<string, any> {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new BadRequestException("Dữ liệu chương trình không hợp lệ.");
    }

    const ownerId = payload["ownerId"];
    const capacity = payload["capacity"];
    const startAt = payload["startAt"];
    const endAt = payload["endAt"];
    const registrationOpenAt = payload["registrationOpenAt"];
    const registrationCloseAt = payload["registrationCloseAt"];

    const isValiDate = (val: any) => typeof val === "string" && !isNaN(new Date(val).getTime());

    if (
      typeof ownerId !== "string" ||
      typeof capacity !== "number" || capacity < 1 ||
      !isValiDate(startAt) ||
      !isValiDate(endAt) ||
      !isValiDate(registrationOpenAt) ||
      !isValiDate(registrationCloseAt)
    ) {
      throw new BadRequestException("Dữ liệu chương trình không hợp lệ hoặc thiếu thời gian.");
    }
    return payload as Record<string, any>;
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
