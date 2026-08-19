import { prisma } from '../../lib/prisma.js';
import type { NotificationType, Prisma } from '@prisma/client';

export const notificationService = {
  async getByUser(userId: string, cursor?: string, limit: number = 20) {
    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, -1) : notifications;

    return { items, nextCursor: hasMore ? items[items.length - 1]?.id : undefined, hasMore };
  },

  async markRead(notificationId: string, userId: string) {
    await prisma.notification.updateMany({
      where: { id: notificationId, recipientId: userId },
      data: { isRead: true },
    });
  },

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
  },

  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
  },

  async create(recipientId: string, type: string, title: string, body?: string, data?: Record<string, unknown>) {
    return prisma.notification.create({
      data: {
        recipientId,
        type: type as NotificationType,
        title,
        body,
        data: data ? (JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue) : undefined,
      },
    });
  },
};
