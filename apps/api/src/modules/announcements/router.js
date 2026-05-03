import { Router } from 'express';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  reactionSchema,
  createCommentSchema,
  updateCommentSchema,
  commentsQuery,
  listAnnouncementsQuery,
} from '@team-hub/schemas';

import { prisma } from '../../db.js';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace-role.js';
import * as ctrl from './controller.js';

async function loadAnnouncementAndMembership(req, _res, next) {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: req.params.id },
      select: { id: true, workspaceId: true, authorId: true },
    });
    if (!announcement) return next(NotFound('Announcement not found'));
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: announcement.workspaceId, userId: req.user.id },
      },
    });
    if (!member) return next(Forbidden('Not a workspace member'));
    req.announcement = announcement;
    req.workspaceMember = member;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAnnouncementAdmin(req, _res, next) {
  if (req.workspaceMember.role === 'ADMIN') return next();
  next(Forbidden('Admin only'));
}

// /workspaces/:id/announcements — workspace-scoped collection.
export const workspaceAnnouncementsRouter = Router({ mergeParams: true });
workspaceAnnouncementsRouter.use(requireAuth);
workspaceAnnouncementsRouter.get(
  '/',
  requireWorkspaceMember('id'),
  validate(listAnnouncementsQuery, 'query'),
  ctrl.list,
);
workspaceAnnouncementsRouter.post(
  '/',
  requireWorkspaceRole('ADMIN', 'id'),
  validate(createAnnouncementSchema),
  ctrl.create,
);

// /announcements — announcement-id routes.
export const announcementsRouter = Router();
announcementsRouter.use(requireAuth);

announcementsRouter.get('/:id', loadAnnouncementAndMembership, ctrl.get);
announcementsRouter.patch(
  '/:id',
  loadAnnouncementAndMembership,
  requireAnnouncementAdmin,
  validate(updateAnnouncementSchema),
  ctrl.update,
);
announcementsRouter.delete(
  '/:id',
  loadAnnouncementAndMembership,
  requireAnnouncementAdmin,
  ctrl.remove,
);

announcementsRouter.post(
  '/:id/reactions',
  loadAnnouncementAndMembership,
  validate(reactionSchema),
  ctrl.addReaction,
);
announcementsRouter.delete(
  '/:id/reactions/:emoji',
  loadAnnouncementAndMembership,
  ctrl.removeReaction,
);

announcementsRouter.get(
  '/:id/comments',
  loadAnnouncementAndMembership,
  validate(commentsQuery, 'query'),
  ctrl.listComments,
);
announcementsRouter.post(
  '/:id/comments',
  loadAnnouncementAndMembership,
  validate(createCommentSchema),
  ctrl.createComment,
);

async function loadCommentAndMembership(req, _res, next) {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.commentId },
      select: {
        id: true,
        authorId: true,
        announcementId: true,
        announcement: { select: { workspaceId: true } },
      },
    });
    if (!comment) return next(NotFound('Comment not found'));
    const workspaceId = comment.announcement.workspaceId;
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
    });
    if (!member) return next(Forbidden('Not a workspace member'));
    req.workspaceMember = member;
    req.commentContext = { workspaceId, announcementId: comment.announcementId };
    next();
  } catch (err) {
    next(err);
  }
}

// /comments/:commentId — author-scoped edit/delete.
export const commentsRouter = Router();
commentsRouter.use(requireAuth);
commentsRouter.patch(
  '/:commentId',
  loadCommentAndMembership,
  validate(updateCommentSchema),
  ctrl.updateComment,
);
commentsRouter.delete('/:commentId', loadCommentAndMembership, ctrl.deleteComment);
