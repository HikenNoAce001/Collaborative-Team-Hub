import { emitToWorkspace } from '../../realtime/emit.js';
import * as service from './service.js';

export async function list(req, res) {
  const result = await service.listActionItems(req.params.id, req.query);
  res.json(result);
}

export async function create(req, res) {
  const workspaceId = req.params.id;
  const item = await service.createActionItem(workspaceId, req.body, req.user.id);
  res.status(201).json({ item });
  emitToWorkspace(workspaceId, 'action-item:created', { workspaceId, item });
}

export async function get(req, res) {
  const item = await service.getActionItem(req.params.id);
  res.json({ item });
}

export async function update(req, res) {
  const workspaceId = req.workspaceMember.workspaceId;
  const item = await service.updateActionItem(req.params.id, workspaceId, req.body, req.user.id);
  res.json({ item });
  emitToWorkspace(workspaceId, 'action-item:updated', { workspaceId, item });
}

export async function remove(req, res) {
  const { workspaceId, id } = req.actionItem;
  await service.deleteActionItem(req.params.id, req.user.id, workspaceId);
  res.status(204).end();
  emitToWorkspace(workspaceId, 'action-item:deleted', { workspaceId, id });
}
