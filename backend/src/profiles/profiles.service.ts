import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ProfileVisibility } from "@prisma/client";
import { createHash, randomUUID } from "crypto";

import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

type ProfileUser = Prisma.UserGetPayload<{
  include: { role: true; profile: true };
}>;

interface RequestContext {
  readonly ip?: string;
  readonly correlationId?: string;
}

@Injectable()
export class ProfilesService {
  private readonly maxAvatarBytes = 1024 * 1024;

  constructor(private readonly prisma: PrismaService) {}

  async getOwnProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { role: true, profile: true },
    });
    if (!user) throw new NotFoundException("Không tìm thấy hồ sơ.");
    return this.toProfile(user);
  }

  async updateOwnProfile(
    userId: string,
    dto: UpdateProfileDto,
    context: RequestContext = {},
  ) {
    this.validateBirthYear(dto.birthYear);
    this.validateAvatar(dto.avatarDataUrl);

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const user = await transaction.user.findFirst({
            where: { id: userId, deletedAt: null },
            include: { role: true, profile: true },
          });
          if (!user) throw new NotFoundException("Không tìm thấy hồ sơ.");

          const currentVersion = user.profile?.version ?? 1;
          if (currentVersion !== dto.expectedVersion) {
            throw new ConflictException(
              "Hồ sơ đã thay đổi. Dữ liệu mới nhất đã được tải lại.",
            );
          }

          const normalized = this.normalize(dto);
          await transaction.user.update({
            where: { id: user.id },
            data: { fullName: normalized.displayName },
          });

          if (user.profile) {
            const changed = await transaction.userProfile.updateMany({
              where: { userId: user.id, version: dto.expectedVersion },
              data: {
                ...normalized.profile,
                version: { increment: 1 },
              },
            });
            if (changed.count !== 1) {
              throw new ConflictException(
                "Hồ sơ đã thay đổi. Dữ liệu mới nhất đã được tải lại.",
              );
            }
          } else {
            await transaction.userProfile.create({
              data: {
                userId: user.id,
                ...normalized.profile,
                version: 2,
              },
            });
          }

          const updated = await transaction.user.findUnique({
            where: { id: user.id },
            include: { role: true, profile: true },
          });
          if (!updated) throw new NotFoundException("Không tìm thấy hồ sơ.");

          await transaction.auditLog.create({
            data: {
              actorType: "USER",
              actorId: user.id,
              action: "UPDATE_OWN_PROFILE",
              entityType: "USER_PROFILE",
              entityId: user.id,
              before: this.auditSnapshot(user),
              after: this.auditSnapshot(updated),
              ipHash: this.hashIp(context.ip),
              correlationId: context.correlationId ?? randomUUID(),
            },
          });
          return this.toProfile(updated);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        throw new ConflictException(
          "Hồ sơ đã thay đổi. Dữ liệu mới nhất đã được tải lại.",
        );
      }
      throw error;
    }
  }

  private normalize(dto: UpdateProfileDto) {
    return {
      displayName: dto.displayName.trim(),
      profile: {
        phone: dto.phone.trim() || null,
        city: dto.city.trim() || null,
        birthYear: dto.birthYear,
        bio: dto.bio.trim() || null,
        avatarDataUrl: dto.avatarDataUrl,
        visibility: dto.visibility,
        showEmail: dto.showEmail,
        allowComments: dto.allowComments,
      },
    };
  }

  private toProfile(user: ProfileUser) {
    return {
      displayName: user.fullName,
      email: user.email,
      role: user.role.name,
      phone: user.profile?.phone ?? "",
      city: user.profile?.city ?? "",
      birthYear: user.profile?.birthYear ?? null,
      bio: user.profile?.bio ?? "",
      avatarDataUrl: user.profile?.avatarDataUrl ?? null,
      visibility: user.profile?.visibility ?? ProfileVisibility.MEMBERS,
      showEmail: user.profile?.showEmail ?? false,
      allowComments: user.profile?.allowComments ?? true,
      version: user.profile?.version ?? 1,
    };
  }

  private auditSnapshot(user: ProfileUser) {
    return {
      displayName: user.fullName,
      phone: user.profile?.phone ?? null,
      city: user.profile?.city ?? null,
      birthYear: user.profile?.birthYear ?? null,
      bio: user.profile?.bio ?? null,
      hasAvatar: Boolean(user.profile?.avatarDataUrl),
      visibility: user.profile?.visibility ?? ProfileVisibility.MEMBERS,
      showEmail: user.profile?.showEmail ?? false,
      allowComments: user.profile?.allowComments ?? true,
      version: user.profile?.version ?? 1,
    };
  }

  private validateBirthYear(birthYear: number | null): void {
    if (birthYear !== null && birthYear > new Date().getFullYear()) {
      throw new BadRequestException("Năm sinh không được ở tương lai.");
    }
  }

  private validateAvatar(value: string | null): void {
    if (value === null) return;
    const match =
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
        value,
      );
    if (!match) {
      throw new BadRequestException("Avatar chỉ nhận tệp JPG, PNG hoặc WebP.");
    }
    if (Buffer.byteLength(match[2], "base64") > this.maxAvatarBytes) {
      throw new BadRequestException(
        "Dung lượng avatar không được vượt quá 1 MB.",
      );
    }
  }

  private hashIp(ip: string | undefined): string | null {
    return ip ? createHash("sha256").update(ip).digest("hex") : null;
  }
}
