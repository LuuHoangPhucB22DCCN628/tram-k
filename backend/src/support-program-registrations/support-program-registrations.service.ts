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
} from "@prisma/client";

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
  ) {}

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
    if (user.role.name !== RoleName.PATIENT && user.role.name !== RoleName.CARER) {
      throw new ForbiddenException("Chỉ bệnh nhân và người nhà bệnh nhân có thể đăng ký.");
    }
    const program = await this.publishedProgram(programId);
    const payload = this.programPayload(program.payload);
    const schedule = program.payload && typeof program.payload === "object" && !Array.isArray(program.payload)
      ? parseStructuredSupportSchedule(program.payload as Record<string, unknown>)
      : null;
    if (!schedule || !scheduleHasUpcomingOccurrence(schedule)) {
      throw new BadRequestException("Chương trình chưa có lịch ngày giờ hợp lệ hoặc đã kết thúc; hiện không nhận đăng ký.");
    }

    return this.prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.supportProgramRegistration.findUnique({
        where: { programId_userId: { programId, userId: actor.id } },
      });
      if (duplicate) throw new ConflictException("Bạn đã đăng ký chương trình này.");

      const occupied = await transaction.supportProgramRegistration.count({
        where: {
          programId,
          status: { not: SupportProgramRegistrationStatus.REJECTED },
        },
      });
      if (occupied >= payload.capacity) {
        throw new ConflictException("Chương trình đã đủ số lượng đăng ký.");
      }

      const registration = await transaction.supportProgramRegistration.create({
        data: {
          programId,
          userId: actor.id,
          applicantName: user.fullName,
          applicantEmail: user.email,
        },
      });
      await this.notifications.create(
        {
          recipientId: actor.id,
          kind: NotificationKind.PROGRAM_REGISTRATION_SENT,
          title: "Đã gửi đăng ký hỗ trợ",
          message: `Đăng ký chương trình “${program.title}” đang chờ nhà hảo tâm xác nhận.`,
          link: `/thanh-vien/chuong-trinh-da-dang-ky?program=${encodeURIComponent(programId)}`,
          dedupeKey: `program-registration:${programId}:${actor.id}:sent`,
        },
        transaction,
      );
      await this.notifications.create(
        {
          recipientId: payload.ownerId,
          kind: NotificationKind.PROGRAM_REGISTRATION_RECEIVED,
          title: "Có đăng ký hỗ trợ mới",
          message: `${user.fullName} vừa đăng ký chương trình “${program.title}”.`,
          link: `/doi-tac/quan-ly-chuong-trinh?program=${encodeURIComponent(programId)}&registration=${encodeURIComponent(actor.id)}`,
          dedupeKey: `program-registration:${programId}:${actor.id}:received`,
        },
        transaction,
      );
      return registration;
    });
  }

  async cancel(actor: AuthenticatedUser, programId: string) {
    const registration = await this.prisma.supportProgramRegistration.findUnique({
      where: { programId_userId: { programId, userId: actor.id } },
    });
    if (!registration) throw new NotFoundException("Không tìm thấy đăng ký.");
    if (registration.status === SupportProgramRegistrationStatus.COMPLETED) {
      throw new BadRequestException("Không thể hủy chương trình đã hoàn thành.");
    }
    await this.prisma.supportProgramRegistration.delete({ where: { id: registration.id } });
    return { cancelled: true };
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

    const reason = dto.decisionReason?.trim();
    if (dto.status === SupportProgramRegistrationStatus.REJECTED && (!reason || reason.length < 10)) {
      throw new BadRequestException("Lý do từ chối phải có ít nhất 10 ký tự.");
    }
    const allowed =
      (registration.status === SupportProgramRegistrationStatus.PENDING_CONFIRMATION &&
        (dto.status === SupportProgramRegistrationStatus.CONFIRMED ||
          dto.status === SupportProgramRegistrationStatus.REJECTED)) ||
      (registration.status === SupportProgramRegistrationStatus.CONFIRMED &&
        dto.status === SupportProgramRegistrationStatus.COMPLETED);
    if (!allowed) throw new BadRequestException("Chuyển trạng thái đăng ký không hợp lệ.");

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.supportProgramRegistration.update({
        where: { id: registration.id },
        data: {
          status: dto.status,
          decisionReason:
            dto.status === SupportProgramRegistrationStatus.REJECTED ? reason : null,
        },
      });
      const notification = this.statusNotification(program.title, programId, userId, dto.status, reason);
      await this.notifications.create(notification, transaction);
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
    if (user.role.name !== RoleName.ADMIN && payload.ownerId !== actor.id) {
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

  private programPayload(payload: Prisma.JsonValue): { ownerId: string; capacity: number } {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new BadRequestException("Dữ liệu chương trình không hợp lệ.");
    }
    const ownerId = payload["ownerId"];
    const capacity = payload["capacity"];
    if (typeof ownerId !== "string" || typeof capacity !== "number" || capacity < 1) {
      throw new BadRequestException("Dữ liệu chương trình không hợp lệ.");
    }
    return { ownerId, capacity };
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
