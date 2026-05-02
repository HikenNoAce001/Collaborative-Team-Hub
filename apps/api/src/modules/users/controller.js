import { prisma } from '../../db.js';
import { BadRequest } from '../../lib/errors.js';
import { uploadBuffer } from '../../lib/cloudinary.js';

export async function updateMe(req, res) {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name: req.body.name },
    select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
  });
  res.json({ user });
}

export async function uploadAvatar(req, res) {
  if (!req.file) throw BadRequest('No file provided — field name must be "file"');

  const { secureUrl } = await uploadBuffer(req.file.buffer, {
    folder: 'team-hub/avatars',
    publicId: `user_${req.user.id}`,
    transformation: [
      { width: 256, height: 256, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatarUrl: secureUrl },
    select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
  });

  res.json({ user });
}
