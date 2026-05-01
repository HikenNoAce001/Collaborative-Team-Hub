import { prisma } from '../db.js';
import { Forbidden, Unauthorized } from '../lib/errors.js';

async function loadMembership(req, paramName) {
  if (!req.user) throw Unauthorized();
  const workspaceId = req.params[paramName];
  if (!workspaceId) throw Forbidden('Workspace id missing');
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
  });
  if (!m) throw Forbidden('Not a workspace member');
  req.workspaceMember = m;
  return m;
}

export function requireWorkspaceMember(paramName = 'id') {
  return async (req, _res, next) => {
    try {
      await loadMembership(req, paramName);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireWorkspaceRole(role, paramName = 'id') {
  return async (req, _res, next) => {
    try {
      const m = await loadMembership(req, paramName);
      if (m.role !== role) return next(Forbidden(`Requires ${role} role`));
      next();
    } catch (err) {
      next(err);
    }
  };
}
