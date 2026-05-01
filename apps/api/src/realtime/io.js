import { Server } from 'socket.io';

import { env } from '../env.js';
import { prisma } from '../db.js';
import { verifyAccess } from '../lib/tokens.js';
import { logger } from '../lib/logger.js';

/** @type {import('socket.io').Server | undefined} */
let io;

export function getIo() {
  return io;
}

function parseCookies(header) {
  const out = {};
  for (const part of header.split(';')) {
    if (!part) continue;
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

function listOnline(workspaceId) {
  if (!io) return [];
  const sids = io.sockets.adapter.rooms.get(`workspace:${workspaceId}`);
  if (!sids) return [];
  const users = new Set();
  for (const sid of sids) {
    const sock = io.sockets.sockets.get(sid);
    if (sock?.userId) users.add(sock.userId);
  }
  return [...users];
}

function broadcastPresence(workspaceId) {
  if (!io) return;
  io.to(`workspace:${workspaceId}`).emit('presence:update', {
    workspaceId,
    online: listOnline(workspaceId),
  });
}

export function attachIo(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
    serveClient: false,
  });

  io.use((socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie ?? '');
      if (!cookies.at) return next(new Error('UNAUTHORIZED'));
      const { sub } = verifyAccess(cookies.at);
      socket.userId = sub;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    logger.debug({ userId: socket.userId, socketId: socket.id }, 'socket connected');

    socket.on('workspace:join', async (payload) => {
      const workspaceId = payload?.workspaceId;
      if (typeof workspaceId !== 'string') return;
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: socket.userId } },
      });
      if (!member) return;
      socket.join(`workspace:${workspaceId}`);
      broadcastPresence(workspaceId);
    });

    socket.on('workspace:leave', (payload) => {
      const workspaceId = payload?.workspaceId;
      if (typeof workspaceId !== 'string') return;
      socket.leave(`workspace:${workspaceId}`);
      broadcastPresence(workspaceId);
    });

    // `disconnecting` fires while the socket still has its rooms; queue
    // a presence broadcast on the next tick so the room reflects the leave.
    socket.on('disconnecting', () => {
      const rooms = [...socket.rooms];
      setImmediate(() => {
        for (const room of rooms) {
          if (room.startsWith('workspace:')) {
            broadcastPresence(room.slice('workspace:'.length));
          }
        }
      });
    });
  });

  return io;
}
