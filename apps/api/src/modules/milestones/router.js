import { Router } from 'express';
import { updateMilestoneSchema } from '@team-hub/schemas';

import { prisma } from '../../db.js';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './controller.js';

async function loadMilestoneAndMembership(req, _res, next) {
  try {
    const milestone = await prisma.milestone.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        progress: true,
        title: true,
        goal: { select: { id: true, ownerId: true, workspaceId: true } },
      },
    });
    if (!milestone) return next(NotFound('Milestone not found'));
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: milestone.goal.workspaceId, userId: req.user.id },
      },
    });
    if (!member) return next(Forbidden('Not a workspace member'));
    req.milestone = milestone;
    req.workspaceMember = member;
    next();
  } catch (err) {
    next(err);
  }
}

function requireGoalOwnerOrAdmin(req, _res, next) {
  if (req.workspaceMember.role === 'ADMIN' || req.milestone.goal.ownerId === req.user.id) {
    return next();
  }
  next(Forbidden('Owner or admin required'));
}

export const milestonesRouter = Router();
milestonesRouter.use(requireAuth);

milestonesRouter.patch(
  '/:id',
  loadMilestoneAndMembership,
  requireGoalOwnerOrAdmin,
  validate(updateMilestoneSchema),
  ctrl.update,
);

milestonesRouter.delete(
  '/:id',
  loadMilestoneAndMembership,
  requireGoalOwnerOrAdmin,
  ctrl.remove,
);
