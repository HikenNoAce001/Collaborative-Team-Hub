// Mirror of the Prisma enums in apps/api/prisma/schema.prisma.
// Kept in sync by hand — there's only ~30 values across 5 enums and they rarely change.
// Frontend uses these for kanban columns, status pills, priority chips, etc.

import { z } from 'zod';

export const Role = z.enum(['ADMIN', 'MEMBER']);
export const GoalStatus = z.enum(['DRAFT', 'ON_TRACK', 'AT_RISK', 'COMPLETED']);
export const ItemStatus = z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']);
export const Priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const AuditAction = z.enum([
  'CREATE',
  'UPDATE',
  'DELETE',
  'PIN',
  'UNPIN',
  'INVITE',
  'ACCEPT_INVITE',
  'REVOKE_INVITE',
  'ROLE_CHANGE',
  'REMOVE_MEMBER',
]);

// Plain-array exports — useful when iterating in UI (e.g. mapping kanban columns)
export const ROLES = Role.options;
export const GOAL_STATUSES = GoalStatus.options;
export const ITEM_STATUSES = ItemStatus.options;
export const PRIORITIES = Priority.options;
