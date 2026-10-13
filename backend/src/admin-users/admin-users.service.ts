import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RoleName, UserStatus } from "@prisma/client";
import { randomUUID } from "crypto";

import { PrismaService } from "../prisma/prisma.service";
import { ListAdminUsersDto } from "./dto/list-admin-users.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

type UserWithAccess = Prisma.UserGetPayload<{
  include: { role: true; partnerMembership: true };
}>;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(adminId: string, query: ListAdminUsersDto) {
    await this.assertActiveAdmin(adminId);
    const where = this.listWhere(query);
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { role: true, partnerMembership: true },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map((user) => this.toAdminUser(user)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async updateStatus(
    adminId: string,
    userId: string,
    dto: UpdateUserStatusDto,
    context: {
      readonly ipHash?: string | null;
      readonly correlationId?: string;
    } = {},
  ) {
    return this.prisma.$transaction(
      async (transaction) => {
        const [admin, target] = await Promise.all([
          transaction.user.findUnique({
            where: { id: adminId },
            include: { role: true, partnerMembership: true },
          }),
          transaction.user.findUnique({
            where: { id: userId },
            include: { role: true, partnerMembership: true },
          }),
        ]);
        this.requireActiveAdmin(admin);
        if (!target || target.deletedAt)
          throw new NotFoundException("Không tìm thấy tài khoản.");
        if (target.id === adminId) {
          throw new ForbiddenException(
            "Quản trị viên không thể thay đổi trạng thái của chính mình.",
          );
        }
        if (
          target.status !== dto.expectedStatus ||
          target.authVersion !== dto.expectedAuthVersion
        ) {
          throw new ConflictException(
            "Tài khoản đã thay đổi. Vui lòng tải lại dữ liệu.",
          );
        }
        if (!this.canTransition(target.status, dto.status)) {
          throw new ConflictException(
            "Không thể chuyển tài khoản sang trạng thái đã chọn.",
          );
        }

        if (
          target.role.name === RoleName.ADMIN &&
          target.status === UserStatus.ACTIVE &&
          dto.status !== UserStatus.ACTIVE
        ) {
          const activeAdminCount = await transaction.user.count({
            where: {
              deletedAt: null,
              status: UserStatus.ACTIVE,
              role: { name: RoleName.ADMIN },
            },
          });
          if (activeAdminCount <= 1) {
            throw new ForbiddenException(
              "Hệ thống phải luôn còn ít nhất một Admin đang hoạt động.",
            );
          }
        }

        const changed = await transaction.user.updateMany({
          where: {
            id: target.id,
            deletedAt: null,
            status: dto.expectedStatus,
            authVersion: dto.expectedAuthVersion,
          },
          data: {
            status: dto.status,
            authVersion: { increment: 1 },
            ...(dto.status === UserStatus.ACTIVE
              ? { loginBlockedUntil: null }
              : {}),
          },
        });
        if (changed.count !== 1) {
          throw new ConflictException(
            "Tài khoản đã thay đổi. Vui lòng tải lại dữ liệu.",
          );
        }

        const now = new Date();
        if (
          dto.status === UserStatus.LOCKED ||
          dto.status === UserStatus.DISABLED
        ) {
          await transaction.authSession.updateMany({
            where: { userId: target.id, revokedAt: null },
            data: { revokedAt: now },
          });
        }
        if (dto.status === UserStatus.DISABLED) {
          await transaction.authToken.updateMany({
            where: { userId: target.id, usedAt: null, revokedAt: null },
            data: { revokedAt: now },
          });
        }

        const correlationId = context.correlationId ?? randomUUID();
        await transaction.auditLog.create({
          data: {
            actorType: "USER",
            actorId: admin.id,
            action: "CHANGE_USER_STATUS",
            entityType: "USER",
            entityId: target.id,
            before: { status: target.status, authVersion: target.authVersion },
            after: { status: dto.status, authVersion: target.authVersion + 1 },
            reason: dto.reason,
            ipHash: context.ipHash,
            correlationId,
          },
        });
        await transaction.outboxEvent.create({
          data: {
            eventId: randomUUID(),
            type: "USER_STATUS_CHANGED",
            aggregateType: "USER",
            aggregateId: target.id,
            payload: {
              recipientId: target.id,
              previousStatus: target.status,
              status: dto.status,
              reason: dto.reason,
              correlationId,
            },
          },
        });

        const updated = await transaction.user.findUnique({
          where: { id: target.id },
          include: { role: true, partnerMembership: true },
        });
        if (!updated) throw new NotFoundException("Không tìm thấy tài khoản.");
        return this.toAdminUser(updated);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async assertActiveAdmin(adminId: string): Promise<void> {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: { role: true },
    });
    this.requireActiveAdmin(admin);
  }

  private requireActiveAdmin(
    user: {
      readonly deletedAt: Date | null;
      readonly status: UserStatus;
      readonly role: { readonly name: RoleName };
    } | null,
  ): asserts user is NonNullable<typeof user> {
    if (
      !user ||
      user.deletedAt ||
      user.status !== UserStatus.ACTIVE ||
      user.role.name !== RoleName.ADMIN
    ) {
      throw new ForbiddenException(
        "Chỉ Admin đang hoạt động được quản lý tài khoản.",
      );
    }
  }

  private canTransition(current: UserStatus, next: UserStatus): boolean {
    if (current === UserStatus.ACTIVE) {
      return next === UserStatus.LOCKED || next === UserStatus.DISABLED;
    }
    if (current === UserStatus.LOCKED) {
      return next === UserStatus.ACTIVE || next === UserStatus.DISABLED;
    }
    return (
      current === UserStatus.PENDING_VERIFY && next === UserStatus.DISABLED
    );
  }

  private listWhere(query: ListAdminUsersDto): Prisma.UserWhereInput {
    const roleWhere =
      query.role === RoleName.PARTNER
        ? { partnerMembership: { isNot: null } }
        : query.role
          ? { role: { name: query.role } }
          : {};
    const search = query.search?.trim();
    return {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...roleWhere,
      ...(search
        ? {
            OR: [
              { id: { contains: search, mode: Prisma.QueryMode.insensitive } },
              {
                email: { contains: search, mode: Prisma.QueryMode.insensitive },
              },
              {
                fullName: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };
  }

  private toAdminUser(user: UserWithAccess) {
    return {
      id: user.id,
      displayName: user.fullName,
      email: user.email,
      role: user.partnerMembership ? RoleName.PARTNER : user.role.name,
      status: user.status,
      authVersion: user.authVersion,
      joinedAt: user.createdAt.toISOString(),
    };
  }
}
