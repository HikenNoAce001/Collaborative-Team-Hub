'use client';

import { io } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';

let socket = null;

/**
 * @returns {import('socket.io-client').Socket}
 */
function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}

/**
 * @param {string} [workspaceId]
 * @returns {{ socket: import('socket.io-client').Socket | null, isConnected: boolean }}
 */
export function useSocket(workspaceId) {
  const [isConnected, setIsConnected] = useState(false);
  const currentRoom = useRef(/** @type {string|null} */ (null));

  useEffect(() => {
    const s = getSocket();

    if (!s.connected) {
      s.connect();
    }

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    if (s.connected) {
      setIsConnected(true);
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  useEffect(() => {
    const s = getSocket();
    if (!workspaceId || !s.connected) return;

    if (currentRoom.current && currentRoom.current !== workspaceId) {
      s.emit('workspace:leave', { workspaceId: currentRoom.current });
    }

    s.emit('workspace:join', { workspaceId });
    currentRoom.current = workspaceId;

    return () => {
      if (currentRoom.current === workspaceId) {
        s.emit('workspace:leave', { workspaceId });
        currentRoom.current = null;
      }
    };
  }, [workspaceId]);

  return { socket: isConnected ? getSocket() : null, isConnected };
}

export { getSocket };
