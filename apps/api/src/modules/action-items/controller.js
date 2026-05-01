import * as service from './service.js';

export async function list(req, res) {
  const result = await service.listActionItems(req.params.id, req.query);
  res.json(result);
}

export async function create(req, res) {
  const item = await service.createActionItem(req.params.id, req.body);
  res.status(201).json({ item });
}

export async function get(req, res) {
  const item = await service.getActionItem(req.params.id);
  res.json({ item });
}

export async function update(req, res) {
  const item = await service.updateActionItem(
    req.params.id,
    req.workspaceMember.workspaceId,
    req.body,
  );
  res.json({ item });
}

export async function remove(req, res) {
  await service.deleteActionItem(req.params.id);
  res.status(204).end();
}
