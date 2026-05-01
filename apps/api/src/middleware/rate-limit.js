import rateLimit from 'express-rate-limit';
import { env } from '../env.js';

// Per CLAUDE.md §9 — 10 attempts/min/ip on /auth/* by default.
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_AUTH_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many attempts, please slow down.' },
  },
});
