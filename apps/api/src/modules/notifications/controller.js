import * as service from './service.js';

export async function list(req, res) {
  const result = await service.listForUser(req.user.id, req.query);
  res.json(result);
}

export async function markRead(req, res) {
  const notification = await service.markRead(req.params.id, req.user.id);
  res.json({ notification });
}

export async function markAllRead(req, res) {
  const result = await service.markAllRead(req.user.id);
  res.json(result);
}
