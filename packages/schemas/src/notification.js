// Notification schemas — REQUIREMENTS.md §H.

import { z } from 'zod';

const cuid = z.string().min(20, 'Invalid id');

export const NotificationKind = z.enum([
  'mention',
  'invitation',
  'goal_assigned',
  'item_assigned',
]);

export const listNotificationsQuery = z.object({
  unreadOnly: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => v === true || v === 'true'),
  before: cuid.optional(),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});
