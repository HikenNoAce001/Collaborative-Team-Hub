import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace-role.js';
import * as ctrl from './controller.js';

// /workspaces/:id/analytics — JSON dashboard for any member.
export const workspaceAnalyticsRouter = Router({ mergeParams: true });
workspaceAnalyticsRouter.use(requireAuth);
workspaceAnalyticsRouter.get('/', requireWorkspaceMember('id'), ctrl.dashboard);

// /workspaces/:id/export/* — CSV exports.
//   goals + action-items: any member (already authorized to read this data).
//   audit: admin only (audit feed itself is admin-only).
export const workspaceExportRouter = Router({ mergeParams: true });
workspaceExportRouter.use(requireAuth);
workspaceExportRouter.get('/goals.csv', requireWorkspaceMember('id'), ctrl.exportGoals);
workspaceExportRouter.get('/action-items.csv', requireWorkspaceMember('id'), ctrl.exportActionItems);
workspaceExportRouter.get('/audit.csv', requireWorkspaceRole('ADMIN', 'id'), ctrl.exportAudit);
