import { Router } from 'express';
import {
  createActionItemSchema,
  updateActionItemSchema,
  listActionItemsQuery,
} from '@team-hub/schemas';

import { prisma } from '../../db.js';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { requireWorkspaceMember } from '../../middleware/workspace-role.js';
import * as ctrl from './controller.js';

async function loadItemAndMembership(req, _res, next) {
  try {
    const item = await prisma.actionItem.findUnique({
      where: { id: req.params.id },
      select: { id: true, workspaceId: true },
    });
    if (!item) return next(NotFound('Action item not found'));
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: item.workspaceId, userId: req.user.id } },
    });
    if (!member) return next(Forbidden('Not a workspace member'));
    req.actionItem = item;
    req.workspaceMember = member;
    next();
  } catch (err) {
    next(err);
  }
}

// /workspaces/:id/action-items — workspace-scoped collection.
export const workspaceActionItemsRouter = Router({ mergeParams: true });
workspaceActionItemsRouter.use(requireAuth);
workspaceActionItemsRouter.get(
  '/',
  requireWorkspaceMember('id'),
  validate(listActionItemsQuery, 'query'),
  ctrl.list,
);
workspaceActionItemsRouter.post(
  '/',
  requireWorkspaceMember('id'),
  validate(createActionItemSchema),
  ctrl.create,
);

// /action-items — item-id routes. Any workspace member may CRUD; tighter perms TODO(scope).
export const actionItemsRouter = Router();
actionItemsRouter.use(requireAuth);
actionItemsRouter.get('/:id', loadItemAndMembership, ctrl.get);
actionItemsRouter.patch(
  '/:id',
  loadItemAndMembership,
  validate(updateActionItemSchema),
  ctrl.update,
);
actionItemsRouter.delete('/:id', loadItemAndMembership, ctrl.remove);
