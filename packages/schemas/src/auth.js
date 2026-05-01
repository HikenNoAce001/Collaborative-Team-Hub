// Auth schemas — REQUIREMENTS.md §B.
// Used by:
//   - apps/api/src/modules/auth/* via the validate() middleware (server-side guard)
//   - apps/web for /login + /register react-hook-form resolvers (client-side hint)
// Same rules, both sides. No drift.

import { z } from 'zod';

const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email')
  .toLowerCase();

const password = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[a-zA-Z]/, 'Must contain a letter')
  .regex(/\d/, 'Must contain a number');

const name = z.string().trim().min(1, 'Name is required').max(80, 'Max 80 characters');

export const registerSchema = z.object({
  email,
  password,
  name,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name,
});

/** @typedef {z.infer<typeof registerSchema>} RegisterInput */
/** @typedef {z.infer<typeof loginSchema>} LoginInput */
/** @typedef {z.infer<typeof updateProfileSchema>} UpdateProfileInput */
