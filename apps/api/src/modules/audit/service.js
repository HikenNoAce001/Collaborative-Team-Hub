import { prisma } from '../../db.js';
import { getRequestContext } from '../../lib/request-context.js';

/**
 * Append an entry to the audit log. Pass a transaction client (`tx`) when the
 * mutation that produced this event runs inside one — the audit row commits or
 * rolls back together with the data change. Actor IP is pulled from
 * AsyncLocalStorage so callers don't have to plumb req.ip through every service.
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
  const { ip } = getRequestContext();
  return db.auditLog.create({
    data: {
      workspaceId: entry.workspaceId,
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before ?? undefined,
      after: entry.after ?? undefined,
      ip: ip ?? undefined,
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
  ip: true,
  createdAt: true,
  actor: { select: { id: true, name: true, email: true, avatarUrl: true } },
};

export async function listAuditLogs(
  workspaceId,
  { action, entityType, actorId, before, from, to, pageSize },
) {
  const where = { workspaceId };
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (actorId) where.actorId = actorId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  let cursorClause;
  if (before) {
    const cursor = await prisma.auditLog.findUnique({
      where: { id: before },
      select: { createdAt: true },
    });
    if (cursor) {
      cursorClause = where.createdAt
        ? { createdAt: { ...where.createdAt, lt: cursor.createdAt } }
        : { createdAt: { lt: cursor.createdAt } };
      delete where.createdAt;
    }
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
