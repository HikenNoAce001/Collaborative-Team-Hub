import { emitToWorkspace } from '../../realtime/emit.js';
import * as service from './service.js';

export async function update(req, res) {
  const milestone = await service.updateMilestone(req.params.id, req.body, req.user.id);
  res.json({ milestone });
  const { workspaceId, id: goalId } = req.milestone.goal;
  emitToWorkspace(workspaceId, 'milestone:updated', { workspaceId, goalId, milestone });
}

export async function remove(req, res) {
  const { workspaceId, id: goalId } = req.milestone.goal;
  const id = req.milestone.id;
  await service.deleteMilestone(req.params.id);
  res.status(204).end();
  emitToWorkspace(workspaceId, 'milestone:deleted', { workspaceId, goalId, id });
}
