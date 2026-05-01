import { prisma } from '../../db.js';
import { NotFound } from '../../lib/errors.js';
import { sanitizeRichText } from '../../lib/sanitize.js';

const announcementSelect = {
  id: true,
  workspaceId: true,
  title: true,
  bodyHtml: true,
  pinned: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  author: { select: { id: true, name: true, email: true, avatarUrl: true } },
  _count: { select: { reactions: true, comments: true } },
};

export async function listAnnouncements(workspaceId, { page, pageSize }) {
  const [data, total] = await prisma.$transaction([
    prisma.announcement.findMany({
      where: { workspaceId },
      select: announcementSelect,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.announcement.count({ where: { workspaceId } }),
  ]);
  return { data, meta: { page, pageSize, total } };
}

export async function createAnnouncement(workspaceId, body, authorId) {
  return prisma.announcement.create({
    data: {
      workspaceId,
      authorId,
      title: body.title,
      bodyHtml: sanitizeRichText(body.body),
      pinned: body.pinned,
    },
    select: announcementSelect,
  });
}

export async function getAnnouncement(announcementId) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: {
      ...announcementSelect,
      reactions: {
        select: { id: true, emoji: true, userId: true, createdAt: true },
      },
    },
  });
  if (!announcement) throw NotFound('Announcement not found');
  return announcement;
}

export async function updateAnnouncement(announcementId, body) {
  const data = { ...body };
  if (data.body !== undefined) {
    data.bodyHtml = sanitizeRichText(data.body);
    delete data.body;
  }
  try {
    return await prisma.announcement.update({
      where: { id: announcementId },
      data,
      select: announcementSelect,
    });
  } catch {
    throw NotFound('Announcement not found');
  }
}

export async function deleteAnnouncement(announcementId) {
  try {
    await prisma.announcement.delete({ where: { id: announcementId } });
  } catch {
    throw NotFound('Announcement not found');
  }
}

export async function addReaction(announcementId, userId, emoji) {
  try {
    return await prisma.reaction.create({
      data: { announcementId, userId, emoji },
      select: { id: true, emoji: true, userId: true, createdAt: true },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      // Already reacted with this emoji — idempotent: return the existing row.
      return prisma.reaction.findUnique({
        where: {
          announcementId_userId_emoji: { announcementId, userId, emoji },
        },
        select: { id: true, emoji: true, userId: true, createdAt: true },
      });
    }
    throw err;
  }
}

export async function removeReaction(announcementId, userId, emoji) {
  try {
    await prisma.reaction.delete({
      where: {
        announcementId_userId_emoji: { announcementId, userId, emoji },
      },
    });
  } catch (err) {
    // P2025 = record not found — treat as idempotent no-op.
    if (err.code === 'P2025') return;
    throw err;
  }
}

export async function listComments(announcementId, { before, pageSize }) {
  let cursorClause;
  if (before) {
    const cursor = await prisma.comment.findUnique({
      where: { id: before },
      select: { createdAt: true },
    });
    if (cursor) cursorClause = { createdAt: { lt: cursor.createdAt } };
  }
  const items = await prisma.comment.findMany({
    where: { announcementId, ...(cursorClause ?? {}) },
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
  const nextCursor = items.length === pageSize ? items[items.length - 1].id : null;
  return { data: items, meta: { nextCursor } };
}

export async function createComment(announcementId, workspaceId, body, authorId) {
  let mentionUserIds = [];
  if (body.mentionUserIds.length > 0) {
    const valid = await prisma.workspaceMember.findMany({
      where: { workspaceId, userId: { in: body.mentionUserIds } },
      select: { userId: true },
    });
    mentionUserIds = valid.map((m) => m.userId);
  }
  return prisma.comment.create({
    data: { announcementId, authorId, body: body.body, mentionUserIds },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
}
