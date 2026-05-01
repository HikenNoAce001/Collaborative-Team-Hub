import { prisma } from '../../db.js';

/**
 * Append an entry to the audit log. Pass a transaction client (`tx`) when the
 * mutation that produced this event runs inside one — the audit row commits or
 * rolls back together with the data change.
 *
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 * @param {{
 *   workspaceId: string,
 *   actorId: string,
 *   action: 'CREATE'|'UPDATE'|'DELETE'|'PIN'|'UNPIN'|'INVITE'|'ACCEPT_INVITE'|'REVOKE_INVITE'|'ROLE_CHANGE'|'REMOVE_MEMBER',
 *   entityType: string,
 *   entityId: string,
 *   before?: unknown,
 *   after?: unknown,
 * }} entry
 */
export function audit(db, entry) {
  return db.auditLog.create({
    data: {
      workspaceId: entry.workspaceId,
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before ?? undefined,
      after: entry.after ?? undefined,
    },
  });
}

const auditSelect = {
  id: true,
  workspaceId: true,
  action: true,
  entityType: true,
  entityId: true,
  before: true,
  after: true,
  createdAt: true,
  actor: { select: { id: true, name: true, email: true, avatarUrl: true } },
};

export async function listAuditLogs(workspaceId, { action, entityType, actorId, before, pageSize }) {
  const where = { workspaceId };
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (actorId) where.actorId = actorId;

  let cursorClause;
  if (before) {
    const cursor = await prisma.auditLog.findUnique({
      where: { id: before },
      select: { createdAt: true },
    });
    if (cursor) cursorClause = { createdAt: { lt: cursor.createdAt } };
  }

  const items = await prisma.auditLog.findMany({
    where: { ...where, ...(cursorClause ?? {}) },
    select: auditSelect,
    orderBy: { createdAt: 'desc' },
    take: pageSize,
  });
  const nextCursor = items.length === pageSize ? items[items.length - 1].id : null;
  return { data: items, meta: { nextCursor } };
}
