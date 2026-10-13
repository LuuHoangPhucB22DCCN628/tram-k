import {
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

@Injectable()
export class PartnerApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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

  async listForAdmin(adminId: string, status?: PartnerApplicationStatus) {
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
    return this.prisma.partnerApplication.findMany({
      where: status ? { status } : undefined,
      include: {
        applicant: {
          select: { id: true, email: true, fullName: true, status: true },
        },
        reviewedBy: { select: { id: true, fullName: true } },
        documents: true,
      },
      orderBy: { updatedAt: "desc" },
    });
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
