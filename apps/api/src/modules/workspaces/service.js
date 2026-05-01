import { prisma } from '../../db.js';
import { Conflict, Forbidden, Gone, NotFound } from '../../lib/errors.js';
import { generateInviteToken, hashInviteToken } from '../../lib/invitation-token.js';

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

export async function updateWorkspace(workspaceId, data) {
  try {
    return await prisma.workspace.update({ where: { id: workspaceId }, data });
  } catch {
    throw NotFound('Workspace not found');
  }
}

export async function deleteWorkspace(workspaceId) {
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
    return tx.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
      select: memberSelect,
    });
  });
}

export async function removeMember(workspaceId, userId) {
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
  const invitation = await prisma.invitation.create({
    data: {
      workspaceId,
      email,
      role,
      tokenHash: hash,
      expiresAt,
      invitedById,
    },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
  });
  // Return the raw token ONCE so the FE can copy/email it. Never persisted in plaintext.
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
  await prisma.invitation.delete({ where: { id: invitationId } });
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
    const workspace = await tx.workspace.findUnique({ where: { id: inv.workspaceId } });
    return { workspace: { ...workspace, myRole: member.role }, member };
  });
}
