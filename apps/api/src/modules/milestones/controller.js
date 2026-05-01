import { emitToWorkspace } from '../../realtime/emit.js';
import * as service from './service.js';

export async function update(req, res) {
  const { workspaceId, id: goalId } = req.milestone.goal;
  const milestone = await service.updateMilestone(
    req.params.id,
    req.body,
    req.user.id,
    workspaceId,
  );
  res.json({ milestone });
  emitToWorkspace(workspaceId, 'milestone:updated', { workspaceId, goalId, milestone });
}

export async function remove(req, res) {
  const { workspaceId, id: goalId } = req.milestone.goal;
  const id = req.milestone.id;
  await service.deleteMilestone(req.params.id, req.user.id, workspaceId);
  res.status(204).end();
  emitToWorkspace(workspaceId, 'milestone:deleted', { workspaceId, goalId, id });
}
