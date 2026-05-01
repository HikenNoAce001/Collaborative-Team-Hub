import { prisma } from '../../db.js';
import { NotFound } from '../../lib/errors.js';
import { audit } from '../audit/service.js';

export async function updateMilestone(milestoneId, body, authorId, workspaceId) {
  const existing = await prisma.milestone.findUnique({ where: { id: milestoneId } });
  if (!existing) throw NotFound('Milestone not found');

  const progressChanged =
    body.progress !== undefined && body.progress !== existing.progress;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.milestone.update({
      where: { id: milestoneId },
      data: body,
    });
    if (progressChanged) {
      await tx.goalUpdate.create({
        data: {
          goalId: existing.goalId,
          authorId,
          body: `Milestone "${updated.title}" progress: ${existing.progress}% → ${updated.progress}%`,
          kind: 'milestone_progress',
          meta: { milestoneId: updated.id, from: existing.progress, to: updated.progress },
        },
      });
    }
    await audit(tx, {
      workspaceId,
      actorId: authorId,
      action: 'UPDATE',
      entityType: 'Milestone',
      entityId: milestoneId,
      before: { title: existing.title, progress: existing.progress },
      after: { title: updated.title, progress: updated.progress },
    });
    return updated;
  });
}

export async function deleteMilestone(milestoneId, actorId, workspaceId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.milestone.findUnique({ where: { id: milestoneId } });
    if (!existing) throw NotFound('Milestone not found');
    await tx.milestone.delete({ where: { id: milestoneId } });
    await audit(tx, {
      workspaceId,
      actorId,
      action: 'DELETE',
      entityType: 'Milestone',
      entityId: milestoneId,
      before: { goalId: existing.goalId, title: existing.title, progress: existing.progress },
    });
  });
}
