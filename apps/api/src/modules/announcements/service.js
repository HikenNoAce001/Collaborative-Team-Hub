import { prisma } from '../../db.js';
import { NotFound } from '../../lib/errors.js';
import { sanitizeRichText } from '../../lib/sanitize.js';
import { audit } from '../audit/service.js';

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
  return prisma.$transaction(async (tx) => {
    const announcement = await tx.announcement.create({
      data: {
        workspaceId,
        authorId,
        title: body.title,
        bodyHtml: sanitizeRichText(body.body),
        pinned: body.pinned,
      },
      select: announcementSelect,
    });
    await audit(tx, {
      workspaceId,
      actorId: authorId,
      action: 'CREATE',
      entityType: 'Announcement',
      entityId: announcement.id,
      after: { title: announcement.title, pinned: announcement.pinned },
    });
    return announcement;
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

export async function updateAnnouncement(announcementId, body, actorId) {
  const data = { ...body };
  if (data.body !== undefined) {
    data.bodyHtml = sanitizeRichText(data.body);
    delete data.body;
  }
  const existing = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!existing) throw NotFound('Announcement not found');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.announcement.update({
      where: { id: announcementId },
      data,
      select: announcementSelect,
    });
    // Pin toggle gets its own audit action; otherwise it's a generic UPDATE.
    const pinChanged = data.pinned !== undefined && data.pinned !== existing.pinned;
    const action = pinChanged ? (updated.pinned ? 'PIN' : 'UNPIN') : 'UPDATE';
    await audit(tx, {
      workspaceId: existing.workspaceId,
      actorId,
      action,
      entityType: 'Announcement',
      entityId: announcementId,
      before: { title: existing.title, pinned: existing.pinned },
      after: { title: updated.title, pinned: updated.pinned },
    });
    return updated;
  });
}

export async function deleteAnnouncement(announcementId, actorId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.announcement.findUnique({ where: { id: announcementId } });
    if (!existing) throw NotFound('Announcement not found');
    await tx.announcement.delete({ where: { id: announcementId } });
    await audit(tx, {
      workspaceId: existing.workspaceId,
      actorId,
      action: 'DELETE',
      entityType: 'Announcement',
      entityId: announcementId,
      before: { title: existing.title, pinned: existing.pinned },
    });
  });
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
