'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Wraps TanStack `useMutation` with the canonical optimistic-update flow
 * (CLAUDE.md §8): cancel in-flight queries → snapshot → apply optimistic
 * patch → on error roll back → on settled invalidate so the realtime event
 * (or a refetch) reconciles.
 *
 * The helper is UI-agnostic. Callers handle their own toast/error messaging
 * via the standard `useMutation` return shape.
 *
 * @template TData, TVars, TCache
 * @param {{
 *   queryKey: import('@tanstack/react-query').QueryKey,
 *   mutationFn: (vars: TVars) => Promise<TData>,
 *   optimisticUpdate: (cache: TCache, vars: TVars) => TCache,
 *   onSuccess?: (data: TData, vars: TVars) => void,
 *   onError?: (err: unknown, vars: TVars) => void,
 * }} opts
 */
export function useOptimisticMutation({
  queryKey,
  mutationFn,
  optimisticUpdate,
  onSuccess,
  onError,
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (current) => optimisticUpdate(current, vars));
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(queryKey, ctx.prev);
      onError?.(err, vars);
    },
    onSuccess,
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}
