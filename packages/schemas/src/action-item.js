// Action item schemas — REQUIREMENTS.md §E.

import { z } from 'zod';
import { ItemStatus, Priority } from './enums.js';

const cuid = z.string().min(20, 'Invalid id');

export const createActionItemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  assigneeId: cuid.optional(),
  priority: Priority.default('MEDIUM'),
  status: ItemStatus.default('TODO'),
  dueDate: z.coerce.date().optional(),
  goalId: cuid.optional(),
});

export const updateActionItemSchema = createActionItemSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  'At least one field must be provided',
);

export const listActionItemsQuery = z.object({
  status: ItemStatus.optional(),
  assigneeId: cuid.optional(),
  priority: Priority.optional(),
  goalId: cuid.optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
