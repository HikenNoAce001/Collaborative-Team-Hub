import { Router } from 'express';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  updateMemberRoleSchema,
  createInvitationSchema,
} from '@team-hub/schemas';

import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace-role.js';
import * as ctrl from './controller.js';

export const workspacesRouter = Router();

workspacesRouter.use(requireAuth);

workspacesRouter.get('/', ctrl.listMine);
workspacesRouter.post('/', validate(createWorkspaceSchema), ctrl.create);

workspacesRouter.get('/:id', requireWorkspaceMember(), ctrl.get);
workspacesRouter.patch(
  '/:id',
  requireWorkspaceRole('ADMIN'),
  validate(updateWorkspaceSchema),
  ctrl.update,
);
workspacesRouter.delete('/:id', requireWorkspaceRole('ADMIN'), ctrl.remove);

workspacesRouter.get('/:id/members', requireWorkspaceMember(), ctrl.listMembers);
workspacesRouter.patch(
  '/:id/members/:userId',
  requireWorkspaceRole('ADMIN'),
  validate(updateMemberRoleSchema),
  ctrl.updateMemberRole,
);
workspacesRouter.delete(
  '/:id/members/:userId',
  requireWorkspaceRole('ADMIN'),
  ctrl.removeMember,
);

workspacesRouter.get('/:id/invitations', requireWorkspaceRole('ADMIN'), ctrl.listInvitations);
workspacesRouter.post(
  '/:id/invitations',
  requireWorkspaceRole('ADMIN'),
  validate(createInvitationSchema),
  ctrl.createInvitation,
);
