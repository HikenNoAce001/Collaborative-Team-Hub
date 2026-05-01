import { prisma } from '../../db.js';

export async function updateMe(req, res) {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name: req.body.name },
    select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
  });
  res.json({ user });
}

// POST /users/me/avatar — TODO(scope): wire Cloudinary upload in a follow-up phase.
