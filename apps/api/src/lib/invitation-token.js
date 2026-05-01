import { randomBytes, createHash } from 'node:crypto';

const INVITE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function generateInviteToken() {
  const raw = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + INVITE_MAX_AGE_MS);
  return { raw, hash, expiresAt };
}

export function hashInviteToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
