import { prisma } from '../../db.js';
import { Conflict, Forbidden, Gone, NotFound } from '../../lib/errors.js';
import { generateInviteToken, hashInviteToken } from '../../lib/invitation-token.js';
import { audit } from '../audit/service.js';

const memberSelect = {
  id: true,
  role: true,
  joinedAt: true,
  user: { select: { id: true, email: true, name: true, avatarUrl: true } },
};

export async function listMine(userId) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { joinedAt: 'desc' },
  });
  return memberships.map((m) => ({ ...m.workspace, myRole: m.role }));
}

export async function createWorkspace({ name, description, accentColor }, creatorId) {
  return prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        name,
        description,
        ...(accentColor ? { accentColor } : {}),
        members: { create: { userId: creatorId, role: 'ADMIN' } },
      },
    });
    await audit(tx, {
      workspaceId: ws.id,
      actorId: creatorId,
      action: 'CREATE',
      entityType: 'Workspace',
      entityId: ws.id,
      after: { name: ws.name },
    });
    return { ...ws, myRole: 'ADMIN' };
  });
}

export async function getWorkspace(workspaceId, userId) {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      _count: { select: { members: true, goals: true, actionItems: true, announcements: true } },
    },
  });
  if (!ws) throw NotFound('Workspace not found');
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return { ...ws, myRole: m?.role ?? null };
}

export async function updateWorkspace(workspaceId, data, actorId) {
  const existing = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!existing) throw NotFound('Workspace not found');
  return prisma.$transaction(async (tx) => {
    const updated = await tx.workspace.update({ where: { id: workspaceId }, data });
    await audit(tx, {
      workspaceId,
      actorId,
      action: 'UPDATE',
      entityType: 'Workspace',
      entityId: workspaceId,
      before: { name: existing.name, description: existing.description, accentColor: existing.accentColor },
      after: { name: updated.name, description: updated.description, accentColor: updated.accentColor },
    });
    return updated;
  });
}

export async function deleteWorkspace(workspaceId) {
  // No audit row: AuditLog.workspaceId cascades on Workspace delete, so the
  // breadcrumb would be wiped along with the workspace. Pino-http already
  // captures the DELETE request with actor context.
  try {
    await prisma.workspace.delete({ where: { id: workspaceId } });
  } catch {
    throw NotFound('Workspace not found');
  }
}

export async function listMembers(workspaceId) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: memberSelect,
    orderBy: { joinedAt: 'asc' },
  });
}

async function adminCount(tx, workspaceId) {
  return tx.workspaceMember.count({ where: { workspaceId, role: 'ADMIN' } });
}

export async function updateMemberRole(workspaceId, userId, role, actorId) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!target) throw NotFound('Member not found');
    if (target.role === 'ADMIN' && role !== 'ADMIN') {
      const admins = await adminCount(tx, workspaceId);
      if (admins <= 1) throw Conflict('Cannot demote the last admin');
      if (target.userId === actorId) throw Conflict('Cannot demote yourself if last admin');
    }
    const updated = await tx.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
      select: memberSelect,
    });
    await audit(tx, {
      workspaceId,
      actorId,
      action: 'ROLE_CHANGE',
      entityType: 'Member',
      entityId: target.id,
      before: { userId, role: target.role },
      after: { userId, role },
    });
    return updated;
  });
}

export async function removeMember(workspaceId, userId, actorId) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!target) throw NotFound('Member not found');
    if (target.role === 'ADMIN') {
      const admins = await adminCount(tx, workspaceId);
      if (admins <= 1) throw Conflict('Cannot remove the last admin');
    }
    await tx.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    await audit(tx, {
      workspaceId,
      actorId,
      action: 'REMOVE_MEMBER',
      entityType: 'Member',
      entityId: target.id,
      before: { userId, role: target.role },
    });
  });
}

export async function createInvitation(workspaceId, { email, role }, invitedById) {
  // 409 if the invited email is already a member.
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const m = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
    });
    if (m) throw Conflict('User is already a workspace member');
  }
  const { raw, hash, expiresAt } = generateInviteToken();
  const invitation = await prisma.$transaction(async (tx) => {
    const created = await tx.invitation.create({
      data: { workspaceId, email, role, tokenHash: hash, expiresAt, invitedById },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    });
    await audit(tx, {
      workspaceId,
      actorId: invitedById,
      action: 'INVITE',
      entityType: 'Invitation',
      entityId: created.id,
      after: { email, role },
    });
    return created;
  });
  // Raw token returned ONCE so the admin can copy it. Never persisted in plaintext.
  return { ...invitation, token: raw };
}

export async function listInvitations(workspaceId) {
  return prisma.invitation.findMany({
    where: { workspaceId },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function revokeInvitation(invitationId, actorUserId) {
  // Verify actor is admin of the invitation's workspace.
  const inv = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!inv) throw NotFound('Invitation not found');
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: inv.workspaceId, userId: actorUserId } },
  });
  if (!m || m.role !== 'ADMIN') throw Forbidden('Admin only');
  await prisma.$transaction(async (tx) => {
    await tx.invitation.delete({ where: { id: invitationId } });
    await audit(tx, {
      workspaceId: inv.workspaceId,
      actorId: actorUserId,
      action: 'REVOKE_INVITE',
      entityType: 'Invitation',
      entityId: invitationId,
      before: { email: inv.email, role: inv.role },
    });
  });
}

export async function acceptInvitation(token, userId) {
  const tokenHash = hashInviteToken(token);
  return prisma.$transaction(async (tx) => {
    const inv = await tx.invitation.findUnique({ where: { tokenHash } });
    if (!inv) throw NotFound('Invitation not found');
    if (inv.expiresAt < new Date()) {
      await tx.invitation.delete({ where: { id: inv.id } });
      throw Gone('Invitation expired');
    }
    const existing = await tx.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: inv.workspaceId, userId } },
    });
    if (existing) {
      await tx.invitation.delete({ where: { id: inv.id } });
      throw Conflict('Already a workspace member');
    }
    const member = await tx.workspaceMember.create({
      data: { workspaceId: inv.workspaceId, userId, role: inv.role },
      select: memberSelect,
    });
    await tx.invitation.delete({ where: { id: inv.id } });
    await audit(tx, {
      workspaceId: inv.workspaceId,
      actorId: userId,
      action: 'ACCEPT_INVITE',
      entityType: 'Member',
      entityId: member.id,
      after: { userId, role: inv.role, invitationId: inv.id },
    });
    const workspace = await tx.workspace.findUnique({ where: { id: inv.workspaceId } });
    return { workspace: { ...workspace, myRole: member.role }, member };
  });
}
