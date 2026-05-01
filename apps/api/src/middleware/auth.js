import { verifyAccess } from '../lib/tokens.js';
import { Unauthorized } from '../lib/errors.js';

export function requireAuth(req, _res, next) {
  const token = req.cookies?.at;
  if (!token) return next(Unauthorized());
  try {
    const payload = verifyAccess(token);
    req.user = { id: payload.sub };
    next();
  } catch {
    next(Unauthorized('Invalid or expired access token'));
  }
}
