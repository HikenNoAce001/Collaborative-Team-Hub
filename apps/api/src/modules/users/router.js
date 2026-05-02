import { Router } from 'express';
import { updateProfileSchema } from '@team-hub/schemas';

import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { imageUpload } from '../../middleware/upload.js';
import { updateMe, uploadAvatar } from './controller.js';

export const usersRouter = Router();

usersRouter.patch('/me', requireAuth, validate(updateProfileSchema), updateMe);
usersRouter.post('/me/avatar', requireAuth, imageUpload({ field: 'file' }), uploadAvatar);
