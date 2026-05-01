import { Router } from 'express';
import { listNotificationsQuery } from '@team-hub/schemas';

import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './controller.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', validate(listNotificationsQuery, 'query'), ctrl.list);
notificationsRouter.post('/read-all', ctrl.markAllRead);
notificationsRouter.post('/:id/read', ctrl.markRead);
