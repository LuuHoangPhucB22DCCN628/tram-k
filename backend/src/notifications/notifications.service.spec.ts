import { NotificationKind } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  const notification = {
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  };
  const user = { findUniqueOrThrow: jest.fn(), update: jest.fn() };
  const prisma = { notification, user } as unknown as PrismaService;
  const service = new NotificationsService(prisma);

  beforeEach(() => jest.clearAllMocks());

  afterEach(() => jest.useRealTimers());

  it("only lists notifications for the authenticated recipient", async () => {
    notification.findMany.mockResolvedValue([{ id: "notification-1" }]);
    notification.count.mockResolvedValue(1);

    const result = await service.listFor("user-1", {
      limit: 20,
      unreadOnly: false,
    });

    expect(notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { recipientId: "user-1" }, take: 21 }),
    );
    expect(result).toEqual({
      items: [{ id: "notification-1" }],
      unreadCount: 1,
      nextCursor: null,
    });
  });

  it("marks only one notification owned by the recipient as read", async () => {
    notification.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.markRead("user-1", "notification-1")).resolves.toEqual({
      updated: true,
    });
    expect(notification.updateMany).toHaveBeenCalledWith({
      where: { id: "notification-1", recipientId: "user-1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it("does not mark a notification owned by someone else as read", async () => {
    notification.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.markRead("user-1", "another-users-notification")).resolves.toEqual({
      updated: false,
    });
    expect(notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: "another-users-notification",
        recipientId: "user-1",
        readAt: null,
      },
      data: { readAt: expect.any(Date) },
    });
  });

  it("marks only notifications created by the start of the mark-all request", async () => {
    const requestStartedAt = new Date("2026-10-22T00:00:00.000Z");
    jest.useFakeTimers().setSystemTime(requestStartedAt);
    notification.updateMany.mockResolvedValue({ count: 2 });

    await expect(service.markAllRead("user-1")).resolves.toEqual({
      updatedCount: 2,
    });

    expect(notification.updateMany).toHaveBeenCalledWith({
      where: {
        recipientId: "user-1",
        readAt: null,
        createdAt: { lte: requestStartedAt },
      },
      data: { readAt: requestStartedAt },
    });
  });

  it("uses a recipient-scoped dedupe key for internal notification creation", async () => {
    notification.upsert.mockResolvedValue({ id: "notification-1" });

    await service.create({
      recipientId: "user-1",
      kind: NotificationKind.PARTNER_APPLICATION_APPROVED,
      title: " Hồ sơ đã được duyệt ",
      message: " Bạn đã trở thành đối tác. ",
      link: " /doi-tac/ho-so ",
      dedupeKey: " partner-application:1:approved ",
    });

    expect(notification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          recipientId_dedupeKey: {
            recipientId: "user-1",
            dedupeKey: "partner-application:1:approved",
          },
        },
      }),
    );
  });

  it("reads and updates only the caller's notification preferences", async () => {
    user.findUniqueOrThrow.mockResolvedValue({
      notifyStoryComments: true, notifyStoryReplies: true, notifyStoryReactions: false,
    });
    await expect(service.preferencesFor("user-1")).resolves.toEqual({
      storyComments: true, storyReplies: true, storyReactions: false,
    });
    user.update.mockResolvedValue({
      notifyStoryComments: false, notifyStoryReplies: true, notifyStoryReactions: false,
    });
    await service.updatePreferences("user-1", { storyComments: false });
    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "user-1" }, data: { notifyStoryComments: false },
    }));
  });
});
