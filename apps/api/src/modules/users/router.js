import { Router } from 'express';
import { updateProfileSchema } from '@team-hub/schemas';

import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { updateMe } from './controller.js';

export const usersRouter = Router();

usersRouter.patch('/me', requireAuth, validate(updateProfileSchema), updateMe);
