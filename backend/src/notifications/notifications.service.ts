import { ForbiddenException, Injectable } from "@nestjs/common";
import { NotificationKind } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";
import { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto";

export interface CreateNotificationInput {
  readonly recipientId: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly message: string;
  readonly link: string;
  readonly dedupeKey?: string;
}

type NotificationWriter = Pick<PrismaService, "notification">;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) { }

  private readonly preferenceSelect = {
    notifyStoryComments: true,
    notifyStoryReplies: true,
    notifyStoryReactions: true,
  } as const;

  async preferencesFor(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId }, select: this.preferenceSelect,
    });
    return {
      storyComments: user.notifyStoryComments,
      storyReplies: user.notifyStoryReplies,
      storyReactions: user.notifyStoryReactions,
    };
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.storyComments !== undefined ? { notifyStoryComments: dto.storyComments } : {}),
        ...(dto.storyReplies !== undefined ? { notifyStoryReplies: dto.storyReplies } : {}),
        ...(dto.storyReactions !== undefined ? { notifyStoryReactions: dto.storyReactions } : {}),
      },
      select: this.preferenceSelect,
    });
    return {
      storyComments: user.notifyStoryComments,
      storyReplies: user.notifyStoryReplies,
      storyReactions: user.notifyStoryReactions,
    };
  }

  async listFor(recipientId: string, query: ListNotificationsQueryDto) {
    if (query.cursor) {
      const cursorNoti = await this.prisma.notification.findUnique({
        where: { id: query.cursor },
        select: { recipientId: true },
      });
      if (!cursorNoti || cursorNoti.recipientId !== recipientId) {
        throw new ForbiddenException("Cursor khoong hợp lệ hoặc không thuộc quyền sở hữu của bạn.");
      }
    }
    const where = {
      recipientId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      }),
      this.prisma.notification.count({ where: { recipientId, readAt: null } }),
    ]);
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      items,
      unreadCount,
      nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
    };
  }

  async markRead(recipientId: string, notificationId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, recipientId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count > 0 };
  }

  async markAllRead(recipientId: string, requestStartedAt: Date = new Date()) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientId, readAt: null, createdAt: { lte: requestStartedAt } },
      data: { readAt: new Date() },
    });
    return { updatedCount: result.count };
  }

  async create(input: CreateNotificationInput, writer: NotificationWriter = this.prisma) {
    const data = {
      recipientId: input.recipientId,
      kind: input.kind,
      title: input.title.trim(),
      message: input.message.trim(),
      link: input.link.trim(),
      dedupeKey: input.dedupeKey?.trim(),
    };
    if (!data.dedupeKey) return writer.notification.create({ data });

    return writer.notification.upsert({
      where: {
        recipientId_dedupeKey: {
          recipientId: data.recipientId,
          dedupeKey: data.dedupeKey,
        },
      },
      create: data,
      update: {},
    });
  }
}
