import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  MemberPostStatus,
  NotificationKind,
  Prisma,
  ProfileVisibility,
  RoleName,
  UserStatus,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateMemberPostDto } from "./dto/create-member-post.dto";
import { ReviewMemberPostDto } from "./dto/review-member-post.dto";

@Injectable()
export class MemberPostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listPublic() {
    const posts = await this.prisma.memberPost.findMany({
      where: { status: MemberPostStatus.PUBLISHED },
      include: {
        user: { select: { profile: { select: { visibility: true } } } },
      },
      orderBy: [{ reviewedAt: "desc" }, { id: "desc" }],
      take: 100,
    });
    return posts.map(({ user, ...post }) => ({
      ...post,
      profileVisibility: user.profile?.visibility ?? ProfileVisibility.MEMBERS,
    }));
  }

  async listMine(userId: string) {
    await this.activeUser(userId);
    return this.prisma.memberPost.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 100,
    });
  }

  async listAdmin(adminId: string) {
    await this.activeAdmin(adminId);
    return this.prisma.memberPost.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 200,
    });
  }

  async create(userId: string, dto: CreateMemberPostDto) {
    const title = dto.title.trim();
    const content = dto.content.trim();
    if (title.length < 5 || content.length < 20) {
      throw new BadRequestException(
        "Tiêu đề hoặc nội dung bài viết chưa đủ dài.",
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const author = await this.activeUser(userId, tx);
      if (author.role.name === RoleName.ADMIN) {
        throw new ForbiddenException(
          "Tài khoản quản trị không gửi câu chuyện thành viên.",
        );
      }
      if (dto.legacyId) {
        const existing = await tx.memberPost.findUnique({
          where: { id: dto.legacyId },
        });
        if (existing) {
          if (existing.userId !== userId)
            throw new ConflictException("Mã bài viết đã được sử dụng.");
          return existing;
        }
      }
      const post = await tx.memberPost.create({
        data: {
          ...(dto.legacyId ? { id: dto.legacyId } : {}),
          userId,
          authorName: author.fullName,
          title,
          content,
          status: dto.status as MemberPostStatus,
        },
      });
      if (post.status === MemberPostStatus.PENDING)
        await this.notifyAdmins(post.id, post.title, post.updatedAt, tx);
      return post;
    });
  }

  async submit(userId: string, postId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.activeUser(userId, tx);
      const changed = await tx.memberPost.updateMany({
        where: {
          id: postId,
          userId,
          status: { in: [MemberPostStatus.DRAFT, MemberPostStatus.REJECTED] },
        },
        data: {
          status: MemberPostStatus.PENDING,
          rejectionReason: null,
          reviewedAt: null,
        },
      });
      if (!changed.count)
        throw new ConflictException(
          "Bài viết không còn ở trạng thái có thể gửi duyệt.",
        );
      const post = await tx.memberPost.findUniqueOrThrow({
        where: { id: postId },
      });
      await this.notifyAdmins(post.id, post.title, post.updatedAt, tx);
      return post;
    });
  }

  async remove(userId: string, postId: string) {
    await this.activeUser(userId);
    const deleted = await this.prisma.memberPost.deleteMany({
      where: {
        id: postId,
        userId,
        status: { not: MemberPostStatus.PUBLISHED },
      },
    });
    if (!deleted.count)
      throw new ConflictException(
        "Không thể xóa bài viết đã xuất bản hoặc không thuộc tài khoản này.",
      );
    return { deleted: true };
  }

  async review(adminId: string, postId: string, dto: ReviewMemberPostDto) {
    if (dto.decision === "REJECTED" && (dto.reason?.trim().length ?? 0) < 10) {
      throw new BadRequestException("Lý do từ chối cần ít nhất 10 ký tự.");
    }
    return this.prisma.$transaction(async (tx) => {
      await this.activeAdmin(adminId, tx);
      const changed = await tx.memberPost.updateMany({
        where: { id: postId, status: MemberPostStatus.PENDING },
        data: {
          status: dto.decision as MemberPostStatus,
          rejectionReason:
            dto.decision === "REJECTED" ? dto.reason!.trim() : null,
          reviewedAt: new Date(),
        },
      });
      if (!changed.count)
        throw new ConflictException("Bài viết không còn chờ duyệt.");
      const post = await tx.memberPost.findUniqueOrThrow({
        where: { id: postId },
        include: { user: { include: { role: true } } },
      });
      const published = post.status === MemberPostStatus.PUBLISHED;
      await this.notifications.create(
        {
          recipientId: post.userId,
          kind: published
            ? NotificationKind.STORY_PUBLISHED
            : NotificationKind.STORY_REJECTED,
          title: published
            ? "Câu chuyện đã được đăng"
            : "Câu chuyện cần chỉnh sửa",
          message: published
            ? `Câu chuyện “${post.title}” đã được duyệt và hiển thị với cộng đồng.`
            : `Câu chuyện “${post.title}” chưa được duyệt. Lý do: ${post.rejectionReason}`,
          link: published
            ? this.storyPath(post.id)
            : post.user.role.name === RoleName.PARTNER
              ? "/doi-tac/bai-viet"
              : "/thanh-vien/bai-viet",
          dedupeKey: `story-review:${post.id}:${post.status}:${post.reviewedAt?.getTime()}`,
        },
        tx,
      );
      return post;
    });
  }

  storyPath(postId: string): string {
    return `/goc-tam-ly?story=${encodeURIComponent(postId)}#cau-chuyen-${encodeURIComponent(postId)}`;
  }

  private async notifyAdmins(
    postId: string,
    title: string,
    submittedAt: Date,
    tx: Prisma.TransactionClient,
  ) {
    const admins = await tx.user.findMany({
      where: {
        deletedAt: null,
        status: UserStatus.ACTIVE,
        role: { name: RoleName.ADMIN },
      },
      select: { id: true },
    });
    for (const admin of admins) {
      await this.notifications.create(
        {
          recipientId: admin.id,
          kind: NotificationKind.STORY_SUBMITTED,
          title: "Có câu chuyện mới cần duyệt",
          message: `Câu chuyện “${title}” đang chờ quản trị viên xét duyệt.`,
          link: "/admin/kiem-duyet",
          dedupeKey: `story-submitted:${postId}:${submittedAt.getTime()}`,
        },
        tx,
      );
    }
  }

  private async activeUser(
    userId: string,
    tx: Pick<PrismaService, "user"> = this.prisma,
  ) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        "Tài khoản không đủ điều kiện thực hiện thao tác này.",
      );
    }
    return user;
  }

  private async activeAdmin(
    userId: string,
    tx: Pick<PrismaService, "user"> = this.prisma,
  ) {
    const user = await this.activeUser(userId, tx);
    if (user.role.name !== RoleName.ADMIN)
      throw new ForbiddenException("Chỉ quản trị viên được duyệt câu chuyện.");
    return user;
  }
}
