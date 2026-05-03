'use client';

import { io } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';

let socket = null;

/**
 * @returns {import('socket.io-client').Socket}
 */
function getSocket() {
  if (!socket) {
    // Connect to same origin so the auth cookie (set on the web origin) is
    // included in the WebSocket handshake. Next.js rewrites /socket.io/* to
    // the API server-side.
    const url =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    // Polling transport only: Next.js rewrites are HTTP-only and don't reliably
    // proxy the WebSocket upgrade handshake. Long-polling (plain HTTP) works
    // through the proxy with the auth cookie attached. Latency is ~1s instead
    // of instant, which is acceptable for presence + activity events.
    socket = io(url, {
      withCredentials: true,
      autoConnect: false,
      transports: ['polling'],
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
    if (!workspaceId || !isConnected) return undefined;

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
  }, [workspaceId, isConnected]);

  return { socket: isConnected ? getSocket() : null, isConnected };
}

export { getSocket };
