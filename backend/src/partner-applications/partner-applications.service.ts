import { randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationKind,
  PartnerApplicationStatus,
  RoleName,
  UserStatus,
} from "@prisma/client";

import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReviewPartnerApplicationDto } from "./dto/review-partner-application.dto";
import { SubmitPartnerApplicationDto } from "./dto/submit-partner-application.dto";
import { ChangePartnerStatusDto } from "./dto/change-partner-status.dto";

@Injectable()
export class PartnerApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) { }

  async submit(applicantId: string, dto: SubmitPartnerApplicationDto) {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: applicantId },
        include: {
          role: true,
          partnerApplication: true,
          partnerMembership: true,
        },
      });
      if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException("Tài khoản không hợp lệ.");
      }
      if (user.role.name === RoleName.ADMIN || user.partnerMembership) {
        throw new ConflictException(
          "Tài khoản đã có quyền đối tác hoặc không đủ điều kiện đăng ký.",
        );
      }
      if (
        user.partnerApplication &&
        user.partnerApplication.status !== PartnerApplicationStatus.REJECTED
      ) {
        throw new ConflictException(
          "Bạn đã có hồ sơ đang chờ duyệt hoặc đã được duyệt.",
        );
      }

      const data = this.normalize(dto);
      const documentKeys = [...new Set(data.documentKeys)];
      const documents = await transaction.partnerApplicationDocument.findMany({
        where: {
          ownerId: applicantId,
          storageKey: { in: documentKeys },
          applicationId: null,
        },
      });
      if (documents.length !== documentKeys.length) {
        throw new ForbiddenException(
          "Tệp minh chứng không hợp lệ hoặc không thuộc tài khoản này.",
        );
      }
      let application;
      if (user.partnerApplication) {
        application = await transaction.partnerApplication.update({
          where: { id: user.partnerApplication.id },
          data: {
            ...data,
            status: PartnerApplicationStatus.PENDING,
            reviewReason: null,
            reviewedById: null,
            reviewedAt: null,
          },
        });
      } else {
        application = await transaction.partnerApplication.create({
          data: { ...data, applicantId },
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
      return application;
    });
  }

  async findMine(applicantId: string) {
    return this.prisma.partnerApplication.findUnique({
      where: { applicantId },
      include: {
        applicant: {
          select: { id: true, email: true, fullName: true, status: true },
        },
        documents: true,
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async listForAdmin(
    adminId: string,
    status?: PartnerApplicationStatus,
    page = 1,
    limit = 20,
  ) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: { role: true },
    });
    if (
      !admin ||
      admin.deletedAt ||
      admin.status !== UserStatus.ACTIVE ||
      admin.role.name !== RoleName.ADMIN
    ) {
      throw new ForbiddenException("Chỉ quản trị viên được xem hồ sơ đối tác.");
    }
    const where = status ? { status } : undefined;
    const [items, total] = await Promise.all([
      this.prisma.partnerApplication.findMany({
        where,
        include: {
          applicant: {
            select: { id: true, email: true, fullName: true, status: true },
          },
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

  async review(
    adminId: string,
    applicationId: string,
    dto: ReviewPartnerApplicationDto,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const [admin, application] = await Promise.all([
        transaction.user.findUnique({
          where: { id: adminId },
          include: { role: true },
        }),
        transaction.partnerApplication.findUnique({
          where: { id: applicationId },
        }),
      ]);
      if (
        !admin ||
        admin.deletedAt ||
        admin.status !== UserStatus.ACTIVE ||
        admin.role.name !== RoleName.ADMIN
      ) {
        throw new ForbiddenException(
          "Chỉ quản trị viên được xét duyệt hồ sơ đối tác.",
        );
      }
      if (!application)
        throw new NotFoundException("Không tìm thấy hồ sơ đối tác.");
      if (application.status !== PartnerApplicationStatus.PENDING) {
        throw new ConflictException("Hồ sơ này đã được xử lý.");
      }

      if (dto.decision === "APPROVED") {
        const applicant = await transaction.user.findUnique({
          where: { id: application.applicantId },
        });

        if (
          !applicant ||
          applicant.deletedAt !== null ||
          applicant.status !== UserStatus.ACTIVE
        ) {
          throw new ConflictException("Không thể duyệt hồ sơ vì người nộp đơn không còn ở trạng thái ACTIVE hoặc đã bị xóa mềm.");
        }
      }

      const now = new Date();
      const status =
        dto.decision === "APPROVED"
          ? PartnerApplicationStatus.APPROVED
          : PartnerApplicationStatus.REJECTED;
      const reviewed = await transaction.partnerApplication.update({
        where: { id: applicationId },
        data: {
          status,
          reviewReason:
            status === PartnerApplicationStatus.REJECTED
              ? dto.reason!.trim()
              : null,
          reviewedById: adminId,
          reviewedAt: now,
        },
        include: {
          applicant: {
            select: { id: true, email: true, fullName: true, status: true },
          },
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
      await this.notifications.create(
        {
          recipientId: application.applicantId,
          kind:
            status === PartnerApplicationStatus.APPROVED
              ? NotificationKind.PARTNER_APPLICATION_APPROVED
              : NotificationKind.PARTNER_APPLICATION_REJECTED,
          title:
            status === PartnerApplicationStatus.APPROVED
              ? "Hồ sơ đối tác đã được duyệt"
              : "Hồ sơ đối tác cần chỉnh sửa",
          message:
            status === PartnerApplicationStatus.APPROVED
              ? "Bạn đã được cấp quyền nhà hảo tâm và có thể đăng ký chương trình hỗ trợ."
              : `Hồ sơ chưa được duyệt. Lý do: ${dto.reason!.trim()}`,
          link:
            status === PartnerApplicationStatus.APPROVED
              ? "/doi-tac/ho-so"
              : "/thanh-vien/dang-ky-doi-tac",
          dedupeKey: `partner-application:${application.id}:${status}:${now.toISOString()}`,
        },
        transaction,
      );
      return reviewed;
    });
  }

  async changePartnerStatus(
    adminId: string,
    targetUserId: string,
    dto: ChangePartnerStatusDto,
    correlationId?: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const admin = await transaction.user.findUnique({
        where: { id: adminId },
        include: { role: true }
      });


      if (
        !admin ||
        admin.deletedAt ||
        admin.status !== UserStatus.ACTIVE ||
        admin.role.name !== RoleName.ADMIN
      ) {
        throw new ForbiddenException("Chỉ quản trị viên được thay đổi trạng thái đối tác.");
      }

      const membership = await transaction.partnerMembership.findUnique({
        where: { userId: targetUserId },
      });

      if (!membership) {
        throw new NotFoundException("Không tìm thấy thông tin đối tác của người dùng này.")
      }

      if (membership.status !== dto.expectedStatus) {
        throw new ConflictException("Trạng thái đối tác đã thay đổi, vui lòng tải lại trang.")
      }
      if (membership.status === dto.status) {
        throw new BadRequestException("Trạng thái mới phải khác trạng thái hiện tại.")
      }

      const updateResult = await transaction.partnerMembership.updateMany({
        where: { userId: targetUserId, status: dto.expectedStatus },
        data: {
          status: dto.status,
        },
      });

      if (updateResult.count !== 1) {
        throw new ConflictException("Trạng thái đối tác đã thay đổi vui lòng tải lại.")
      }

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
    })
  }

  private normalize(dto: SubmitPartnerApplicationDto) {
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
