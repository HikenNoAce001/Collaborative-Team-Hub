import { prisma } from '../../db.js';
import { NotFound } from '../../lib/errors.js';

export async function updateMilestone(milestoneId, body, authorId) {
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
    return updated;
  });
}

export async function deleteMilestone(milestoneId) {
  try {
    await prisma.milestone.delete({ where: { id: milestoneId } });
  } catch {
    throw NotFound('Milestone not found');
  }
}
