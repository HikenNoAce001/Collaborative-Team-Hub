import * as service from './service.js';

export async function listMine(req, res) {
  const workspaces = await service.listMine(req.user.id);
  res.json({ workspaces });
}

export async function create(req, res) {
  const workspace = await service.createWorkspace(req.body, req.user.id);
  res.status(201).json({ workspace });
}

export async function get(req, res) {
  const workspace = await service.getWorkspace(req.params.id, req.user.id);
  res.json({ workspace });
}

export async function update(req, res) {
  const workspace = await service.updateWorkspace(req.params.id, req.body);
  res.json({ workspace });
}

export async function remove(req, res) {
  await service.deleteWorkspace(req.params.id);
  res.status(204).end();
}

export async function listMembers(req, res) {
  const members = await service.listMembers(req.params.id);
  res.json({ members });
}

export async function updateMemberRole(req, res) {
  const member = await service.updateMemberRole(
    req.params.id,
    req.params.userId,
    req.body.role,
    req.user.id,
  );
  res.json({ member });
}

export async function removeMember(req, res) {
  await service.removeMember(req.params.id, req.params.userId);
  res.status(204).end();
}

export async function createInvitation(req, res) {
  const invitation = await service.createInvitation(req.params.id, req.body, req.user.id);
  res.status(201).json({ invitation });
}

export async function listInvitations(req, res) {
  const invitations = await service.listInvitations(req.params.id);
  res.json({ invitations });
}

export async function revokeInvitation(req, res) {
  await service.revokeInvitation(req.params.id, req.user.id);
  res.status(204).end();
}

export async function acceptInvitation(req, res) {
  const result = await service.acceptInvitation(req.body.token, req.user.id);
  res.status(201).json(result);
}
