import { prisma } from '../../db.js';
import { NotFound } from '../../lib/errors.js';
import { audit } from '../audit/service.js';

const itemSelect = {
  id: true,
  workspaceId: true,
  goalId: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  assigneeId: true,
  assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
  goal: { select: { id: true, title: true } },
};

async function assertAssigneeIsMember(workspaceId, assigneeId) {
  if (!assigneeId) return;
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: assigneeId } },
  });
  if (!m) throw NotFound('Assignee is not a workspace member');
}

async function assertGoalInWorkspace(workspaceId, goalId) {
  if (!goalId) return;
  const g = await prisma.goal.findFirst({
    where: { id: goalId, workspaceId },
    select: { id: true },
  });
  if (!g) throw NotFound('Goal not found in this workspace');
}

export async function listActionItems(
  workspaceId,
  { status, assigneeId, priority, goalId, q, page, pageSize },
) {
  const where = { workspaceId };
  if (status) where.status = status;
  if (assigneeId) where.assigneeId = assigneeId;
  if (priority) where.priority = priority;
  if (goalId) where.goalId = goalId;
  if (q) where.title = { contains: q, mode: 'insensitive' };

  const [data, total] = await prisma.$transaction([
    prisma.actionItem.findMany({
      where,
      select: itemSelect,
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.actionItem.count({ where }),
  ]);
  return { data, meta: { page, pageSize, total } };
}

export async function createActionItem(workspaceId, body, actorId) {
  await assertAssigneeIsMember(workspaceId, body.assigneeId);
  await assertGoalInWorkspace(workspaceId, body.goalId);
  return prisma.$transaction(async (tx) => {
    const item = await tx.actionItem.create({
      data: { workspaceId, ...body },
      select: itemSelect,
    });
    await audit(tx, {
      workspaceId,
      actorId,
      action: 'CREATE',
      entityType: 'ActionItem',
      entityId: item.id,
      after: { title: item.title, status: item.status, priority: item.priority, assigneeId: item.assigneeId, goalId: item.goalId },
    });
    return item;
  });
}

export async function getActionItem(itemId) {
  const item = await prisma.actionItem.findUnique({
    where: { id: itemId },
    select: itemSelect,
  });
  if (!item) throw NotFound('Action item not found');
  return item;
}

export async function updateActionItem(itemId, workspaceId, body, actorId) {
  await assertAssigneeIsMember(workspaceId, body.assigneeId);
  await assertGoalInWorkspace(workspaceId, body.goalId);
  const existing = await prisma.actionItem.findUnique({ where: { id: itemId } });
  if (!existing) throw NotFound('Action item not found');
  return prisma.$transaction(async (tx) => {
    const updated = await tx.actionItem.update({
      where: { id: itemId },
      data: body,
      select: itemSelect,
    });
    await audit(tx, {
      workspaceId,
      actorId,
      action: 'UPDATE',
      entityType: 'ActionItem',
      entityId: itemId,
      before: { title: existing.title, status: existing.status, priority: existing.priority, assigneeId: existing.assigneeId },
      after: { title: updated.title, status: updated.status, priority: updated.priority, assigneeId: updated.assigneeId },
    });
    return updated;
  });
}

export async function deleteActionItem(itemId, actorId, workspaceId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.actionItem.findUnique({ where: { id: itemId } });
    if (!existing) throw NotFound('Action item not found');
    await tx.actionItem.delete({ where: { id: itemId } });
    await audit(tx, {
      workspaceId,
      actorId,
      action: 'DELETE',
      entityType: 'ActionItem',
      entityId: itemId,
      before: { title: existing.title, status: existing.status },
    });
  });
}
