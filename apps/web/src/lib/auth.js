'use client';

import { useQuery } from '@tanstack/react-query';
import api from './api';

/**
 * Cached `/auth/me` lookup. The server-side workspace layout already gates auth,
 * so this is just to surface the current user's id/name/email/avatar to client
 * components that need it (e.g. "did I react?", comment author, mentions).
 */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.user),
    staleTime: 5 * 60 * 1000,
  });
}
