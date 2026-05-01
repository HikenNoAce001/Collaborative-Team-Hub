import { prisma } from '../../db.js';
import { NotFound } from '../../lib/errors.js';
import { audit } from '../audit/service.js';

const goalSelect = {
  id: true,
  workspaceId: true,
  title: true,
  description: true,
  status: true,
  dueDate: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
  _count: { select: { milestones: true, updates: true, actionItems: true } },
};

export async function listGoals(workspaceId, { status, ownerId, q, page, pageSize }) {
  const where = { workspaceId };
  if (status) where.status = status;
  if (ownerId) where.ownerId = ownerId;
  if (q) where.title = { contains: q, mode: 'insensitive' };

  const [data, total] = await prisma.$transaction([
    prisma.goal.findMany({
      where,
      select: goalSelect,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.goal.count({ where }),
  ]);
  return { data, meta: { page, pageSize, total } };
}

export async function createGoal(workspaceId, body, creatorId) {
  const ownerId = body.ownerId ?? creatorId;
  const ownerMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: ownerId } },
  });
  if (!ownerMember) throw NotFound('Owner is not a member of this workspace');

  return prisma.$transaction(async (tx) => {
    const goal = await tx.goal.create({
      data: {
        workspaceId,
        ownerId,
        title: body.title,
        description: body.description,
        dueDate: body.dueDate,
        status: body.status,
      },
      select: goalSelect,
    });
    await audit(tx, {
      workspaceId,
      actorId: creatorId,
      action: 'CREATE',
      entityType: 'Goal',
      entityId: goal.id,
      after: { title: goal.title, status: goal.status, ownerId: goal.ownerId },
    });
    return goal;
  });
}

export async function getGoal(goalId) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: {
      ...goalSelect,
      milestones: { orderBy: { createdAt: 'asc' } },
      updates: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });
  if (!goal) throw NotFound('Goal not found');
  return goal;
}

export async function updateGoal(goalId, body, actorId) {
  const existing = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!existing) throw NotFound('Goal not found');

  const statusChanged = body.status && body.status !== existing.status;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.goal.update({
      where: { id: goalId },
      data: body,
      select: goalSelect,
    });
    if (statusChanged) {
      await tx.goalUpdate.create({
        data: {
          goalId,
          authorId: actorId,
          body: `Status changed from ${existing.status} to ${updated.status}`,
          kind: 'status_change',
          meta: { from: existing.status, to: updated.status },
        },
      });
    }
    await audit(tx, {
      workspaceId: updated.workspaceId,
      actorId,
      action: 'UPDATE',
      entityType: 'Goal',
      entityId: goalId,
      before: { title: existing.title, status: existing.status, ownerId: existing.ownerId },
      after: { title: updated.title, status: updated.status, ownerId: updated.ownerId },
    });
    return updated;
  });
}

export async function deleteGoal(goalId, actorId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.goal.findUnique({ where: { id: goalId } });
    if (!existing) throw NotFound('Goal not found');
    await tx.goal.delete({ where: { id: goalId } });
    await audit(tx, {
      workspaceId: existing.workspaceId,
      actorId,
      action: 'DELETE',
      entityType: 'Goal',
      entityId: goalId,
      before: { title: existing.title, status: existing.status },
    });
  });
}

export async function listGoalUpdates(goalId, { before, pageSize }) {
  let cursorClause;
  if (before) {
    const cursor = await prisma.goalUpdate.findUnique({
      where: { id: before },
      select: { createdAt: true },
    });
    if (cursor) cursorClause = { createdAt: { lt: cursor.createdAt } };
  }

  const items = await prisma.goalUpdate.findMany({
    where: { goalId, ...(cursorClause ?? {}) },
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
  const nextCursor = items.length === pageSize ? items[items.length - 1].id : null;
  return { data: items, meta: { nextCursor } };
}

export async function createGoalUpdate(goalId, body, authorId) {
  return prisma.goalUpdate.create({
    data: { goalId, authorId, body: body.body, kind: 'post' },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
}

export async function createMilestone(goalId, body, authorId, workspaceId) {
  return prisma.$transaction(async (tx) => {
    const milestone = await tx.milestone.create({
      data: { goalId, title: body.title, progress: body.progress },
    });
    if (body.progress > 0) {
      await tx.goalUpdate.create({
        data: {
          goalId,
          authorId,
          body: `Milestone "${milestone.title}" created at ${milestone.progress}% progress`,
          kind: 'milestone_progress',
          meta: { milestoneId: milestone.id, from: 0, to: milestone.progress },
        },
      });
    }
    await audit(tx, {
      workspaceId,
      actorId: authorId,
      action: 'CREATE',
      entityType: 'Milestone',
      entityId: milestone.id,
      after: { goalId, title: milestone.title, progress: milestone.progress },
    });
    return milestone;
  });
}
