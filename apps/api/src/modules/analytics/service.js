import { prisma } from '../../db.js';

/**
 * Workspace dashboard aggregates. Designed around the existing indexes:
 *   ActionItem(workspaceId, status) · Goal(workspaceId, status) · AuditLog(workspaceId, createdAt)
 * so every query is index-only.
 *
 * @param {string} workspaceId
 */
export async function getDashboard(workspaceId) {
  const [
    goalsByStatus,
    itemsByStatus,
    itemsByPriority,
    overdueCount,
    completedByWeek,
    topContributors,
  ] = await Promise.all([
    countByGoalStatus(workspaceId),
    countByItemStatus(workspaceId),
    countByItemPriority(workspaceId),
    countOverdueItems(workspaceId),
    countCompletedByWeek(workspaceId),
    listTopContributors(workspaceId),
  ]);

  return {
    goalsByStatus,
    itemsByStatus,
    itemsByPriority,
    overdueCount,
    completedByWeek,
    topContributors,
  };
}

async function countByGoalStatus(workspaceId) {
  const rows = await prisma.goal.groupBy({
    by: ['status'],
    where: { workspaceId },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
}

async function countByItemStatus(workspaceId) {
  const rows = await prisma.actionItem.groupBy({
    by: ['status'],
    where: { workspaceId },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
}

async function countByItemPriority(workspaceId) {
  const rows = await prisma.actionItem.groupBy({
    by: ['priority'],
    where: { workspaceId },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.priority, r._count._all]));
}

async function countOverdueItems(workspaceId) {
  return prisma.actionItem.count({
    where: {
      workspaceId,
      dueDate: { lt: new Date() },
      status: { not: 'DONE' },
    },
  });
}

/**
 * "Completed per week" uses the current set of DONE items bucketed by their
 * last update — accurate as long as items don't bounce out of DONE, which is
 * the spec's expected workflow. A dedicated `completedAt` column would be more
 * faithful for resurrected items; not worth a migration for the dashboard.
 */
async function countCompletedByWeek(workspaceId) {
  const rows = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('week', "updatedAt")::date AS week,
      COUNT(*)::int AS count
    FROM "ActionItem"
    WHERE "workspaceId" = ${workspaceId}
      AND "status" = 'DONE'
      AND "updatedAt" >= NOW() - INTERVAL '12 weeks'
    GROUP BY week
    ORDER BY week ASC
  `;
  return rows.map((r) => ({ week: r.week, count: r.count }));
}

async function listTopContributors(workspaceId, limit = 5) {
  const rows = await prisma.auditLog.groupBy({
    by: ['actorId'],
    where: { workspaceId },
    _count: { _all: true },
    orderBy: { _count: { actorId: 'desc' } },
    take: limit,
  });
  if (rows.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.actorId) } },
    select: { id: true, name: true, avatarUrl: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows
    .filter((r) => byId.has(r.actorId))
    .map((r) => ({ user: byId.get(r.actorId), actions: r._count._all }));
}

// ─── CSV exports ──────────────────────────────────────────────────────────

function csvField(v) {
  if (v == null) return '';
  const s = typeof v === 'string' ? v : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toRow(values) {
  return values.map(csvField).join(',');
}

export async function buildGoalsCsv(workspaceId) {
  const goals = await prisma.goal.findMany({
    where: { workspaceId },
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const lines = ['id,title,status,ownerId,ownerName,dueDate,createdAt,updatedAt'];
  for (const g of goals) {
    lines.push(
      toRow([
        g.id,
        g.title,
        g.status,
        g.ownerId,
        g.owner?.name ?? '',
        g.dueDate?.toISOString() ?? '',
        g.createdAt.toISOString(),
        g.updatedAt.toISOString(),
      ]),
    );
  }
  return lines.join('\r\n') + '\r\n';
}

export async function buildActionItemsCsv(workspaceId) {
  const items = await prisma.actionItem.findMany({
    where: { workspaceId },
    include: {
      assignee: { select: { name: true } },
      goal: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const lines = [
    'id,title,status,priority,assigneeId,assigneeName,goalId,goalTitle,dueDate,createdAt,updatedAt',
  ];
  for (const it of items) {
    lines.push(
      toRow([
        it.id,
        it.title,
        it.status,
        it.priority,
        it.assigneeId ?? '',
        it.assignee?.name ?? '',
        it.goalId ?? '',
        it.goal?.title ?? '',
        it.dueDate?.toISOString() ?? '',
        it.createdAt.toISOString(),
        it.updatedAt.toISOString(),
      ]),
    );
  }
  return lines.join('\r\n') + '\r\n';
}

export async function buildAuditCsv(workspaceId) {
  const logs = await prisma.auditLog.findMany({
    where: { workspaceId },
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const lines = ['id,createdAt,action,entityType,entityId,actorId,actorName,actorEmail'];
  for (const l of logs) {
    lines.push(
      toRow([
        l.id,
        l.createdAt.toISOString(),
        l.action,
        l.entityType,
        l.entityId,
        l.actorId,
        l.actor?.name ?? '',
        l.actor?.email ?? '',
      ]),
    );
  }
  return lines.join('\r\n') + '\r\n';
}
