import { Router } from 'express';
import {
  createGoalSchema,
  updateGoalSchema,
  listGoalsQuery,
  createGoalUpdateSchema,
  goalUpdatesQuery,
  createMilestoneSchema,
} from '@team-hub/schemas';

import { prisma } from '../../db.js';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { requireWorkspaceMember } from '../../middleware/workspace-role.js';
import * as ctrl from './controller.js';

async function loadGoalAndMembership(req, _res, next) {
  try {
    const goal = await prisma.goal.findUnique({
      where: { id: req.params.id },
      select: { id: true, workspaceId: true, ownerId: true },
    });
    if (!goal) return next(NotFound('Goal not found'));
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: goal.workspaceId, userId: req.user.id } },
    });
    if (!member) return next(Forbidden('Not a workspace member'));
    req.goal = goal;
    req.workspaceMember = member;
    next();
  } catch (err) {
    next(err);
  }
}

function requireGoalOwnerOrAdmin(req, _res, next) {
  if (req.workspaceMember.role === 'ADMIN' || req.goal.ownerId === req.user.id) return next();
  next(Forbidden('Owner or admin required'));
}

// /workspaces/:id/goals — workspace-scoped collection.
export const workspaceGoalsRouter = Router({ mergeParams: true });
workspaceGoalsRouter.use(requireAuth);
workspaceGoalsRouter.get(
  '/',
  requireWorkspaceMember('id'),
  validate(listGoalsQuery, 'query'),
  ctrl.list,
);
workspaceGoalsRouter.post(
  '/',
  requireWorkspaceMember('id'),
  validate(createGoalSchema),
  ctrl.create,
);

// /goals — goal-id routes.
export const goalsRouter = Router();
goalsRouter.use(requireAuth);

goalsRouter.get('/:id', loadGoalAndMembership, ctrl.get);
goalsRouter.patch(
  '/:id',
  loadGoalAndMembership,
  requireGoalOwnerOrAdmin,
  validate(updateGoalSchema),
  ctrl.update,
);
goalsRouter.delete('/:id', loadGoalAndMembership, requireGoalOwnerOrAdmin, ctrl.remove);

goalsRouter.get(
  '/:id/updates',
  loadGoalAndMembership,
  validate(goalUpdatesQuery, 'query'),
  ctrl.listUpdates,
);
goalsRouter.post(
  '/:id/updates',
  loadGoalAndMembership,
  validate(createGoalUpdateSchema),
  ctrl.createUpdate,
);
goalsRouter.post(
  '/:id/milestones',
  loadGoalAndMembership,
  validate(createMilestoneSchema),
  ctrl.createMilestone,
);
