import { emitToWorkspace } from '../../realtime/emit.js';
import * as service from './service.js';

export async function list(req, res) {
  const result = await service.listGoals(req.params.id, req.query);
  res.json(result);
}

export async function create(req, res) {
  const workspaceId = req.params.id;
  const goal = await service.createGoal(workspaceId, req.body, req.user.id);
  res.status(201).json({ goal });
  emitToWorkspace(workspaceId, 'goal:created', { workspaceId, goal });
}

export async function get(req, res) {
  const goal = await service.getGoal(req.params.id);
  res.json({ goal });
}

export async function update(req, res) {
  const goal = await service.updateGoal(req.params.id, req.body, req.user.id);
  res.json({ goal });
  emitToWorkspace(goal.workspaceId, 'goal:updated', { workspaceId: goal.workspaceId, goal });
}

export async function remove(req, res) {
  const { workspaceId, id } = req.goal;
  await service.deleteGoal(req.params.id);
  res.status(204).end();
  emitToWorkspace(workspaceId, 'goal:deleted', { workspaceId, id });
}

export async function listUpdates(req, res) {
  const result = await service.listGoalUpdates(req.params.id, req.query);
  res.json(result);
}

export async function createUpdate(req, res) {
  const update = await service.createGoalUpdate(req.params.id, req.body, req.user.id);
  res.status(201).json({ update });
  emitToWorkspace(req.goal.workspaceId, 'goal-update:created', {
    workspaceId: req.goal.workspaceId,
    goalId: req.goal.id,
    update,
  });
}

export async function createMilestone(req, res) {
  const milestone = await service.createMilestone(req.params.id, req.body, req.user.id);
  res.status(201).json({ milestone });
  emitToWorkspace(req.goal.workspaceId, 'milestone:created', {
    workspaceId: req.goal.workspaceId,
    goalId: req.goal.id,
    milestone,
  });
}
