import { randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  PartnerApplicationStatus,
  RoleName,
  UserStatus,
} from "@prisma/client";

import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReviewPartnerApplicationDto } from "./dto/review-partner-application.dto";
import { SubmitPartnerApplicationDto } from "./dto/submit-partner-application.dto";
import { SavePartnerDraftDto } from "./dto/save-partner-draft.dto";
import { ChangePartnerStatusDto } from "./dto/change-partner-status.dto";

@Injectable()
export class PartnerApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) { }

  async saveDraft(applicantId: string, dto: SavePartnerDraftDto) {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: applicantId },
        include: { role: true, partnerApplication: true, partnerMembership: true },
      });

      if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException("Tài khoản không hợp lệ.");
      }
      if (user.role.name === RoleName.ADMIN || user.partnerMembership) {
        throw new ConflictException("Tài khoản đã có quyền đối tác.");
      }

      const existing = user.partnerApplication;
      if (existing && existing.status !== PartnerApplicationStatus.DRAFT && existing.status !== PartnerApplicationStatus.REJECTED) {
        throw new ConflictException("Không thể lưu nháp khi hồ sơ đang chờ duyệt hoặc đã duyệt.");
      }

      const data = this.normalizeDraft(dto);

      if (existing) {
        return transaction.partnerApplication.update({
          where: { id: existing.id },
          data: {
            ...data,
            status: PartnerApplicationStatus.DRAFT,
            reviewReason: null,
            reviewedById: null,
            reviewedAt: null,
            version: { increment: 1 },
          },
        });
      } else {
        return transaction.partnerApplication.create({
          data: {
            ...data,
            applicantId,
            status: PartnerApplicationStatus.DRAFT,
          },
        });
      }
    });
  }

  async submit(applicantId: string, dto: SubmitPartnerApplicationDto) {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: applicantId },
        include: { role: true, partnerApplication: true, partnerMembership: true },
      });

      if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException("Tài khoản không hợp lệ.");
      }
      if (user.role.name === RoleName.ADMIN || user.partnerMembership) {
        throw new ConflictException("Tài khoản đã có quyền đối tác.");
      }

      const existing = user.partnerApplication;
      if (existing && existing.status !== PartnerApplicationStatus.DRAFT && existing.status !== PartnerApplicationStatus.REJECTED) {
        throw new ConflictException("Hồ sơ đang chờ duyệt hoặc đã được duyệt.");
      }

      if (existing && existing.version !== dto.expectedVersion) {
        throw new ConflictException("Hồ sơ đã bị thay đổi. Vui lòng tải lại trang.");
      }

      const data = this.normalizeSubmit(dto);
      const documentKeys = [...new Set(data.documentKeys)];

      const documents = await transaction.partnerApplicationDocument.findMany({
        where: {
          ownerId: applicantId,
          storageKey: { in: documentKeys },
        },
      });
      if (documents.length !== documentKeys.length) {
        throw new ForbiddenException("Tệp minh chứng không hợp lệ hoặc không thuộc tài khoản này.");
      }

      const trackingCode = existing?.trackingCode || this.generateTrackingCode();

      let application;
      if (existing) {
        application = await transaction.partnerApplication.update({
          where: { id: existing.id },
          data: {
            ...data,
            trackingCode,
            status: PartnerApplicationStatus.PENDING,
            reviewReason: null,
            reviewedById: null,
            reviewedAt: null,
            version: { increment: 1 },
          },
        });
      } else {
        application = await transaction.partnerApplication.create({
          data: {
            ...data,
            applicantId,
            trackingCode,
            status: PartnerApplicationStatus.PENDING,
          },
        });
      }

      await transaction.partnerApplicationDocument.updateMany({
        where: { applicationId: application.id },
        data: { applicationId: null },
      });
      await transaction.partnerApplicationDocument.updateMany({
        where: { id: { in: documents.map((document) => document.id) } },
        data: { applicationId: application.id },
      });

      await transaction.auditLog.create({
        data: {
          actorType: "USER",
          actorId: applicantId,
          action: "SUBMIT_PARTNER_APPLICATION",
          entityType: "PARTNER_APPLICATION",
          entityId: application.id,
          after: { status: PartnerApplicationStatus.PENDING, trackingCode },
          correlationId: randomUUID(),
        },
      });

      return application;
    });
  }

  async findMine(applicantId: string) {
    return this.prisma.partnerApplication.findUnique({
      where: { applicantId },
      include: {
        applicant: { select: { id: true, email: true, fullName: true, status: true } },
        documents: true,
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async listForAdmin(adminId: string, status?: PartnerApplicationStatus, page = 1, limit = 20) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId }, include: { role: true },
    });
    if (!admin || admin.deletedAt || admin.status !== UserStatus.ACTIVE || admin.role.name !== RoleName.ADMIN) {
      throw new ForbiddenException("Chỉ quản trị viên được xem hồ sơ đối tác.");
    }
    const where = status ? { status } : { status: PartnerApplicationStatus.PENDING };
    const [items, total] = await Promise.all([
      this.prisma.partnerApplication.findMany({
        where,
        include: {
          applicant: { select: { id: true, email: true, fullName: true, status: true } },
          reviewedBy: { select: { id: true, fullName: true } },
          documents: true,
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.partnerApplication.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async review(adminId: string, applicationId: string, dto: ReviewPartnerApplicationDto) {
    return this.prisma.$transaction(async (transaction) => {
      const [admin, application] = await Promise.all([
        transaction.user.findUnique({ where: { id: adminId }, include: { role: true } }),
        transaction.partnerApplication.findUnique({ where: { id: applicationId } }),
      ]);

      if (!admin || admin.deletedAt || admin.status !== UserStatus.ACTIVE || admin.role.name !== RoleName.ADMIN) {
        throw new ForbiddenException("Chỉ quản trị viên được xét duyệt hồ sơ đối tác.");
      }
      if (!application) throw new NotFoundException("Không tìm thấy hồ sơ đối tác.");
      if (application.status !== PartnerApplicationStatus.PENDING) {
        throw new ConflictException("Hồ sơ này đã được xử lý.");
      }

      if (dto.decision === "APPROVED") {
        const applicant = await transaction.user.findUnique({ where: { id: application.applicantId } });
        if (!applicant || applicant.deletedAt !== null || applicant.status !== UserStatus.ACTIVE) {
          throw new ConflictException("Không thể duyệt hồ sơ vì người nộp đơn không còn ở trạng thái ACTIVE hoặc đã bị xóa mềm.");
        }
      }

      const now = new Date();
      const status = dto.decision === "APPROVED" ? PartnerApplicationStatus.APPROVED : PartnerApplicationStatus.REJECTED;

      const reviewed = await transaction.partnerApplication.update({
        where: { id: applicationId },
        data: {
          status,
          reviewReason: status === PartnerApplicationStatus.REJECTED ? dto.reason!.trim() : null,
          reviewedById: adminId,
          reviewedAt: now,
          version: { increment: 1 },
        },
        include: {
          applicant: { select: { id: true, email: true, fullName: true, status: true } },
          reviewedBy: { select: { id: true, fullName: true } },
          documents: true,
        },
      });

      if (status === PartnerApplicationStatus.APPROVED) {
        await transaction.partnerMembership.create({
          data: {
            userId: application.applicantId,
            applicationId: application.id,
            grantedById: adminId,
            grantedAt: now,
          },
        });
      }

      await transaction.outboxEvent.create({
        data: {
          eventId: randomUUID(),
          type: "PARTNER_APPLICATION_REVIEWED",
          aggregateType: "PartnerApplication",
          aggregateId: application.id,
          payload: {
            applicantId: application.applicantId,
            status: status,
            reason: dto.reason?.trim() || null,
            applicationId: application.id,
          },
        },
      });

      return reviewed;
    });
  }

  async changePartnerStatus(adminId: string, targetUserId: string, dto: ChangePartnerStatusDto, correlationId?: string) {
    return this.prisma.$transaction(async (transaction) => {
      const admin = await transaction.user.findUnique({ where: { id: adminId }, include: { role: true } });
      if (!admin || admin.deletedAt || admin.status !== UserStatus.ACTIVE || admin.role.name !== RoleName.ADMIN) {
        throw new ForbiddenException("Chỉ quản trị viên được thay đổi trạng thái đối tác.");
      }
      const membership = await transaction.partnerMembership.findUnique({ where: { userId: targetUserId } });
      if (!membership) throw new NotFoundException("Không tìm thấy thông tin đối tác.");
      if (membership.status !== dto.expectedStatus) throw new ConflictException("Trạng thái đối tác đã thay đổi.");
      if (membership.status === dto.status) throw new BadRequestException("Trạng thái mới phải khác trạng thái hiện tại.");

      const updateResult = await transaction.partnerMembership.updateMany({
        where: { userId: targetUserId, status: dto.expectedStatus },
        data: { status: dto.status },
      });

      if (updateResult.count !== 1) throw new ConflictException("Trạng thái đối tác đã thay đổi.");

      await transaction.auditLog.create({
        data: {
          actorType: "USER",
          actorId: admin.id,
          action: "CHANGE_PARTNER_STATUS",
          entityType: "PARTNER_MEMBERSHIP",
          entityId: membership.id,
          before: { status: dto.expectedStatus },
          after: { status: dto.status },
          reason: dto.reason,
          correlationId: correlationId ?? randomUUID(),
        },
      });

      return { ...membership, status: dto.status };
    });
  }

  private generateTrackingCode(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = randomBytes(3).toString('hex').toUpperCase();
    return `TK-${dateStr}-${randomStr}`;
  }

  private normalizeDraft(dto: SavePartnerDraftDto) {
    return {
      organizationName: dto.organizationName?.trim(),
      representativeName: dto.representativeName?.trim(),
      phone: dto.phone?.trim(),
      email: dto.email?.trim().toLowerCase(),
      address: dto.address?.trim(),
      introduction: dto.introduction?.trim(),
      documentKeys: dto.documentKeys?.map((key) => key.trim()) || [],
    };
  }

  private normalizeSubmit(dto: SubmitPartnerApplicationDto) {
    return {
      organizationName: dto.organizationName.trim(),
      representativeName: dto.representativeName.trim(),
      phone: dto.phone.trim(),
      email: dto.email.trim().toLowerCase(),
      address: dto.address.trim(),
      introduction: dto.introduction.trim(),
      documentKeys: dto.documentKeys.map((key) => key.trim()),
    };
  }
}