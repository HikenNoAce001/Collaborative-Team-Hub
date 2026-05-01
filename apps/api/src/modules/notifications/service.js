import { prisma } from '../../db.js';
import { NotFound } from '../../lib/errors.js';

const notificationSelect = {
  id: true,
  recipientId: true,
  kind: true,
  payload: true,
  readAt: true,
  createdAt: true,
};

export async function listForUser(userId, { unreadOnly, before, pageSize }) {
  const where = { recipientId: userId };
  if (unreadOnly) where.readAt = null;

  let cursorClause;
  if (before) {
    const cursor = await prisma.notification.findUnique({
      where: { id: before },
      select: { createdAt: true },
    });
    if (cursor) cursorClause = { createdAt: { lt: cursor.createdAt } };
  }

  const [items, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { ...where, ...(cursorClause ?? {}) },
      select: notificationSelect,
      orderBy: { createdAt: 'desc' },
      take: pageSize,
    }),
    prisma.notification.count({ where: { recipientId: userId, readAt: null } }),
  ]);
  const nextCursor = items.length === pageSize ? items[items.length - 1].id : null;
  return { data: items, meta: { nextCursor, unreadCount } };
}

export async function markRead(notificationId, userId) {
  const existing = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { recipientId: true, readAt: true },
  });
  if (!existing || existing.recipientId !== userId) throw NotFound('Notification not found');
  if (existing.readAt) {
    return prisma.notification.findUnique({ where: { id: notificationId }, select: notificationSelect });
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
    select: notificationSelect,
  });
}

export async function markAllRead(userId) {
  const result = await prisma.notification.updateMany({
    where: { recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}
