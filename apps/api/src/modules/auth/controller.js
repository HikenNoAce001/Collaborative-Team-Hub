import * as service from './service.js';
import { setAccessCookie, setRefreshCookie, clearAuthCookies } from '../../lib/cookies.js';

export async function register(req, res) {
  const { user, accessToken, refreshToken } = await service.registerUser(req.body);
  setAccessCookie(res, accessToken);
  setRefreshCookie(res, refreshToken);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const { user, accessToken, refreshToken } = await service.loginUser(req.body);
  setAccessCookie(res, accessToken);
  setRefreshCookie(res, refreshToken);
  res.json({ user });
}

export async function refresh(req, res, next) {
  const rt = req.cookies?.rt;
  if (!rt) {
    clearAuthCookies(res);
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'No refresh token' },
    });
  }
  try {
    const { user, accessToken, refreshToken } = await service.rotateRefresh(rt);
    setAccessCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);
    res.json({ user });
  } catch (err) {
    clearAuthCookies(res);
    next(err);
  }
}

export async function logout(req, res) {
  await service.revokeRefresh(req.cookies?.rt);
  clearAuthCookies(res);
  res.status(204).end();
}

export async function me(req, res) {
  const user = await service.getMe(req.user.id);
  res.json({ user });
}
