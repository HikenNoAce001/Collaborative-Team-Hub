import { Router } from 'express';
import { listAuditLogsQuery } from '@team-hub/schemas';

import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { requireWorkspaceRole } from '../../middleware/workspace-role.js';
import * as ctrl from './controller.js';

// /workspaces/:id/audit-logs — admin-only audit feed.
export const workspaceAuditRouter = Router({ mergeParams: true });
workspaceAuditRouter.use(requireAuth);
workspaceAuditRouter.get(
  '/',
  requireWorkspaceRole('ADMIN', 'id'),
  validate(listAuditLogsQuery, 'query'),
  ctrl.list,
);
