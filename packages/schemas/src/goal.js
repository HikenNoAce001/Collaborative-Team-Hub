// Goal + milestone + activity-feed schemas — REQUIREMENTS.md §D.

import { z } from 'zod';
import { GoalStatus } from './enums.js';

const cuid = z.string().min(20, 'Invalid id'); // cuid v1 is ≥ 25 chars; loose check.

export const createGoalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  ownerId: cuid.optional(), // defaults to creator on the server when omitted
  dueDate: z.coerce.date().optional(),
  status: GoalStatus.default('DRAFT'),
});

export const updateGoalSchema = createGoalSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  'At least one field must be provided',
);

export const listGoalsQuery = z.object({
  status: GoalStatus.optional(),
  ownerId: cuid.optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const createMilestoneSchema = z.object({
  title: z.string().trim().min(1).max(200),
  progress: z.coerce.number().int().min(0).max(100).default(0),
});

export const updateMilestoneSchema = createMilestoneSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  'At least one field must be provided',
);

export const createGoalUpdateSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const goalUpdatesQuery = z.object({
  before: cuid.optional(), // cursor pagination
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
