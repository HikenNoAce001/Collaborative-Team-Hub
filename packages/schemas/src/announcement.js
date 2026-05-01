// Announcement + reaction + comment schemas — REQUIREMENTS.md §F.

import { z } from 'zod';

const cuid = z.string().min(20, 'Invalid id');

// Tiptap emits HTML; the API sanitizes server-side via sanitize-html before persisting.
// This schema only enforces presence + length — the *content* safety is enforced by sanitize-html.
const richTextHtml = z.string().min(1, 'Content is required').max(50_000);

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: richTextHtml,
  pinned: z.boolean().default(false),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  'At least one field must be provided',
);

export const reactionSchema = z.object({
  // Allow common emoji forms — single grapheme up to 8 chars (covers ZWJ-joined forms).
  emoji: z.string().min(1).max(8),
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  mentionUserIds: z.array(cuid).max(50).default([]),
});

export const commentsQuery = z.object({
  before: cuid.optional(),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const listAnnouncementsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
