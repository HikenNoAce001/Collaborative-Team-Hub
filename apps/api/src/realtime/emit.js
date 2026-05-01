import { getIo } from './io.js';

export function emitToWorkspace(workspaceId, event, payload) {
  const io = getIo();
  if (!io) return;
  io.to(`workspace:${workspaceId}`).emit(event, payload);
}

export function emitToUser(userId, event, payload) {
  const io = getIo();
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}
