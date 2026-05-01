// bcryptjs (pure JS) instead of bcrypt (native). Same async API; no native
// rebuild needed when Node version changes. Slower per hash but we only
// hash on register/login.
import bcrypt from 'bcryptjs';

import { prisma } from '../../db.js';
import {
  signAccess,
  signRefresh,
  verifyRefresh,
  hashRefresh,
  refreshExpiresAt,
} from '../../lib/tokens.js';
import { Conflict, Unauthorized } from '../../lib/errors.js';

const BCRYPT_COST = 12;

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
  };
}

async function persistRefresh(userId, refreshToken, tx = prisma) {
  await tx.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefresh(refreshToken),
      expiresAt: refreshExpiresAt(),
    },
  });
}

async function issueTokens(userId, tx = prisma) {
  const accessToken = signAccess(userId);
  const refreshToken = signRefresh(userId);
  await persistRefresh(userId, refreshToken, tx);
  return { accessToken, refreshToken };
}

export async function registerUser({ email, password, name }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Conflict('Email already in use');
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await prisma.user.create({ data: { email, passwordHash, name } });
  const tokens = await issueTokens(user.id);
  return { user: publicUser(user), ...tokens };
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Generic message either way — don't leak which field was wrong.
  if (!user) throw Unauthorized('Invalid email or password');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw Unauthorized('Invalid email or password');
  const tokens = await issueTokens(user.id);
  return { user: publicUser(user), ...tokens };
}

export async function rotateRefresh(currentRt) {
  let payload;
  try {
    payload = verifyRefresh(currentRt);
  } catch {
    throw Unauthorized('Invalid refresh token');
  }
  const tokenHash = hashRefresh(currentRt);

  return prisma.$transaction(async (tx) => {
    const stored = await tx.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw Unauthorized('Refresh token revoked or expired');
    }
    if (stored.userId !== payload.sub) {
      throw Unauthorized('Refresh token / user mismatch');
    }
    const user = await tx.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw Unauthorized();

    await tx.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await issueTokens(user.id, tx);
    return { user: publicUser(user), ...tokens };
  });
}

export async function revokeRefresh(rt) {
  if (!rt) return;
  const tokenHash = hashRefresh(rt);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Unauthorized();
  return publicUser(user);
}
