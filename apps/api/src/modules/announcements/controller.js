import { emitToUser, emitToWorkspace } from '../../realtime/emit.js';
import * as service from './service.js';

export async function list(req, res) {
  const result = await service.listAnnouncements(req.params.id, req.query);
  res.json(result);
}

export async function create(req, res) {
  const workspaceId = req.params.id;
  const announcement = await service.createAnnouncement(workspaceId, req.body, req.user.id);
  res.status(201).json({ announcement });
  emitToWorkspace(workspaceId, 'announcement:created', { workspaceId, announcement });
}

export async function get(req, res) {
  const announcement = await service.getAnnouncement(req.params.id);
  res.json({ announcement });
}

export async function update(req, res) {
  const announcement = await service.updateAnnouncement(req.params.id, req.body);
  res.json({ announcement });
  emitToWorkspace(announcement.workspaceId, 'announcement:updated', {
    workspaceId: announcement.workspaceId,
    announcement,
  });
}

export async function remove(req, res) {
  const { workspaceId, id } = req.announcement;
  await service.deleteAnnouncement(req.params.id);
  res.status(204).end();
  emitToWorkspace(workspaceId, 'announcement:deleted', { workspaceId, id });
}

export async function addReaction(req, res) {
  const reaction = await service.addReaction(req.params.id, req.user.id, req.body.emoji);
  res.status(201).json({ reaction });
  emitToWorkspace(req.announcement.workspaceId, 'reaction:added', {
    workspaceId: req.announcement.workspaceId,
    announcementId: req.announcement.id,
    reaction,
  });
}

export async function removeReaction(req, res) {
  await service.removeReaction(req.params.id, req.user.id, req.params.emoji);
  res.status(204).end();
  emitToWorkspace(req.announcement.workspaceId, 'reaction:removed', {
    workspaceId: req.announcement.workspaceId,
    announcementId: req.announcement.id,
    userId: req.user.id,
    emoji: req.params.emoji,
  });
}

export async function listComments(req, res) {
  const result = await service.listComments(req.params.id, req.query);
  res.json(result);
}

export async function createComment(req, res) {
  const comment = await service.createComment(
    req.params.id,
    req.announcement.workspaceId,
    req.body,
    req.user.id,
  );
  res.status(201).json({ comment });
  emitToWorkspace(req.announcement.workspaceId, 'comment:created', {
    workspaceId: req.announcement.workspaceId,
    announcementId: req.announcement.id,
    comment,
  });
}
