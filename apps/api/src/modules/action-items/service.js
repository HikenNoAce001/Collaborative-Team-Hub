import { prisma } from '../../db.js';
import { NotFound } from '../../lib/errors.js';

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

export async function createActionItem(workspaceId, body) {
  await assertAssigneeIsMember(workspaceId, body.assigneeId);
  await assertGoalInWorkspace(workspaceId, body.goalId);
  return prisma.actionItem.create({
    data: { workspaceId, ...body },
    select: itemSelect,
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

export async function updateActionItem(itemId, workspaceId, body) {
  await assertAssigneeIsMember(workspaceId, body.assigneeId);
  await assertGoalInWorkspace(workspaceId, body.goalId);
  return prisma.actionItem.update({
    where: { id: itemId },
    data: body,
    select: itemSelect,
  });
}

export async function deleteActionItem(itemId) {
  try {
    await prisma.actionItem.delete({ where: { id: itemId } });
  } catch {
    throw NotFound('Action item not found');
  }
}
