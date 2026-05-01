import { Router } from 'express';
import { acceptInvitationSchema } from '@team-hub/schemas';

import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from '../workspaces/controller.js';

// /invitations/:id and /invitations/accept (top-level routes per ARCHITECTURE.md §5)
export const invitationsRouter = Router();

invitationsRouter.use(requireAuth);

invitationsRouter.post(
  '/accept',
  validate(acceptInvitationSchema),
  ctrl.acceptInvitation,
);
invitationsRouter.delete('/:id', ctrl.revokeInvitation);
