// Workspace + member + invitation schemas — REQUIREMENTS.md §C.

import { z } from 'zod';
import { Role } from './enums.js';

const accentColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Use a hex color like #6366F1')
  .default('#6366F1');

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  accentColor: accentColor.optional(),
});

export const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500),
    accentColor,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field must be provided');

export const updateMemberRoleSchema = z.object({ role: Role });

export const createInvitationSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  role: Role.default('MEMBER'),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(20, 'Invalid invitation token'),
});

/** @typedef {z.infer<typeof createWorkspaceSchema>} CreateWorkspaceInput */
/** @typedef {z.infer<typeof updateWorkspaceSchema>} UpdateWorkspaceInput */
/** @typedef {z.infer<typeof createInvitationSchema>} CreateInvitationInput */
