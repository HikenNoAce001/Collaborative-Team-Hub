// Shared seed helpers — used by both seed.js (prod demo) and seed.dev.js (rich dev data).
// Every helper is idempotent so re-running converges on the same state.

import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

export const log = (...args) => console.info('[seed]', ...args);
export const days = (n) => new Date(Date.now() + n * 86_400_000);
export const hours = (n) => new Date(Date.now() + n * 3_600_000);

export async function upsertUser({ email, name, password, avatarUrl = null }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: { name, avatarUrl, passwordHash },
    create: { email, name, passwordHash, avatarUrl },
  });
}

export async function upsertWorkspace({ name, description, accentColor = '#6366F1' }) {
  const existing = await prisma.workspace.findFirst({ where: { name } });
  if (existing) {
    return prisma.workspace.update({
      where: { id: existing.id },
      data: { description, accentColor },
    });
  }
  return prisma.workspace.create({ data: { name, description, accentColor } });
}

export async function upsertMember(workspaceId, userId, role) {
  return prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId } },
    update: { role },
    create: { workspaceId, userId, role },
  });
}

export async function upsertGoal(workspaceId, ownerId, body) {
  const existing = await prisma.goal.findFirst({
    where: { workspaceId, title: body.title },
  });
  if (existing) {
    return prisma.goal.update({
      where: { id: existing.id },
      data: { ...body, ownerId },
    });
  }
  return prisma.goal.create({ data: { workspaceId, ownerId, ...body } });
}

export async function upsertMilestone(goalId, body) {
  const existing = await prisma.milestone.findFirst({ where: { goalId, title: body.title } });
  if (existing) {
    return prisma.milestone.update({ where: { id: existing.id }, data: body });
  }
  return prisma.milestone.create({ data: { goalId, ...body } });
}

export async function upsertItem(workspaceId, body) {
  const existing = await prisma.actionItem.findFirst({
    where: { workspaceId, title: body.title },
  });
  if (existing) {
    return prisma.actionItem.update({ where: { id: existing.id }, data: body });
  }
  return prisma.actionItem.create({ data: { workspaceId, ...body } });
}

export async function upsertAnnouncement(workspaceId, authorId, body) {
  const existing = await prisma.announcement.findFirst({
    where: { workspaceId, title: body.title },
  });
  if (existing) {
    return prisma.announcement.update({
      where: { id: existing.id },
      data: { bodyHtml: body.bodyHtml, pinned: body.pinned, authorId },
    });
  }
  return prisma.announcement.create({ data: { workspaceId, authorId, ...body } });
}

export async function upsertReaction(announcementId, userId, emoji) {
  return prisma.reaction.upsert({
    where: { announcementId_userId_emoji: { announcementId, userId, emoji } },
    update: {},
    create: { announcementId, userId, emoji },
  });
}

export async function upsertComment(announcementId, authorId, body, mentionUserIds = []) {
  const existing = await prisma.comment.findFirst({
    where: { announcementId, authorId, body },
  });
  if (existing) {
    return prisma.comment.update({
      where: { id: existing.id },
      data: { mentionUserIds },
    });
  }
  return prisma.comment.create({ data: { announcementId, authorId, body, mentionUserIds } });
}

export async function upsertNotification(recipientId, kind, payload) {
  const candidates = await prisma.notification.findMany({ where: { recipientId, kind } });
  const match = candidates.find(
    (n) =>
      n.payload?.commentId === payload.commentId &&
      n.payload?.announcementId === payload.announcementId,
  );
  if (match) return match;
  return prisma.notification.create({ data: { recipientId, kind, payload } });
}

export async function withSeed(fn) {
  try {
    await fn();
  } catch (err) {
    console.error('[seed] failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
