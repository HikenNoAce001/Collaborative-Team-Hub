import { isProd, env } from '../env.js';

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// On Railway the web and api services live on different *.up.railway.app
// subdomains, so the auth cookies are cross-site. Browsers only forward
// cross-site cookies when SameSite=None AND Secure=true. In dev (same-origin
// localhost) we keep SameSite=Lax for CSRF defense-in-depth.
const baseOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

const accessOpts = { ...baseOpts, path: '/', maxAge: ACCESS_MAX_AGE_MS };
const refreshOpts = { ...baseOpts, path: '/auth', maxAge: REFRESH_MAX_AGE_MS };

export function setAccessCookie(res, token) {
  res.cookie('at', token, accessOpts);
}

export function setRefreshCookie(res, token) {
  res.cookie('rt', token, refreshOpts);
}

export function clearAuthCookies(res) {
  res.clearCookie('at', { ...baseOpts, path: '/' });
  res.clearCookie('rt', { ...baseOpts, path: '/auth' });
}
