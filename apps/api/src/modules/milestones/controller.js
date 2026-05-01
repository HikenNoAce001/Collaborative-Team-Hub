import * as service from './service.js';

export async function update(req, res) {
  const milestone = await service.updateMilestone(req.params.id, req.body, req.user.id);
  res.json({ milestone });
}

export async function remove(req, res) {
  await service.deleteMilestone(req.params.id);
  res.status(204).end();
}
