// Audit log query schema — REQUIREMENTS.md §I.

import { z } from 'zod';
import { AuditAction } from './enums.js';

const cuid = z.string().min(20, 'Invalid id');

export const ENTITY_TYPES = [
  'Workspace',
  'Member',
  'Invitation',
  'Goal',
  'Milestone',
  'ActionItem',
  'Announcement',
];

export const EntityType = z.enum(ENTITY_TYPES);

export const listAuditLogsQuery = z.object({
  action: AuditAction.optional(),
  entityType: EntityType.optional(),
  actorId: cuid.optional(),
  before: cuid.optional(), // cursor by AuditLog id
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});
