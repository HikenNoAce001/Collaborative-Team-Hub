import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../env.js';

const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function signAccess(userId) {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL });
}

export function verifyAccess(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function signRefresh(userId) {
  // jti = random nonce so two refresh tokens issued in the same second for the
  // same user produce different JWTs (and therefore different sha256 hashes,
  // avoiding RefreshToken.tokenHash unique-constraint conflicts).
  return jwt.sign(
    { sub: userId, type: 'refresh', jti: randomBytes(16).toString('hex') },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.REFRESH_TOKEN_TTL },
  );
}

export function verifyRefresh(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

export function hashRefresh(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshExpiresAt() {
  return new Date(Date.now() + REFRESH_MAX_AGE_MS);
}
