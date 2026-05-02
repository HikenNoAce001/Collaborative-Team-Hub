'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LayoutGrid, List as ListIcon, Plus, Search } from 'lucide-react';
import { PRIORITIES } from '@team-hub/schemas';

import api from '@/lib/api';
import { useSocket } from '@/lib/socket';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { useOptimisticMutation } from '@/lib/optimistic';
import { useActionItemsViewStore } from '@/stores/useActionItemsViewStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { STATUS_COLUMNS } from './constants';
import KanbanBoard from './KanbanBoard';
import ListView from './ListView';
import ItemFormDialog from './ItemFormDialog';

function apiErrorMessage(err, fallback) {
  return err?.response?.data?.error?.message ?? fallback;
}

export default function ActionItemsView() {
  const { workspace } = useWorkspace();
  const qc = useQueryClient();
  const { socket } = useSocket(workspace.id);
  const { view, setView } = useActionItemsViewStore();

  const [filters, setFilters] = useState({ q: '', assigneeId: '', priority: '' });
  const [editingItem, setEditingItem] = useState(/** @type {any|null} */ (null));
  const [creating, setCreating] = useState(false);

  const queryKey = useMemo(() => ['action-items', workspace.id, filters], [workspace.id, filters]);

  const itemsQuery = useQuery({
    queryKey,
    queryFn: () =>
      api
        .get(`/workspaces/${workspace.id}/action-items`, {
          params: {
            q: filters.q || undefined,
            assigneeId: filters.assigneeId || undefined,
            priority: filters.priority || undefined,
            pageSize: 100,
          },
        })
        .then((r) => r.data),
  });

  const membersQuery = useQuery({
    queryKey: ['members', workspace.id],
    queryFn: () => api.get(`/workspaces/${workspace.id}/members`).then((r) => r.data.members),
  });

  // Realtime: patch the cache so dragging on one tab updates the other.
  useEffect(() => {
    if (!socket) return undefined;
    const matches = (item) => {
      if (filters.assigneeId && item.assigneeId !== filters.assigneeId) return false;
      if (filters.priority && item.priority !== filters.priority) return false;
      if (filters.q && !item.title.toLowerCase().includes(filters.q.toLowerCase())) return false;
      return true;
    };
    const onCreated = (p) => {
      if (p.workspaceId !== workspace.id || !matches(p.item)) return;
      qc.setQueryData(queryKey, (prev) => {
        if (!prev) return prev;
        if (prev.data.some((i) => i.id === p.item.id)) return prev;
        return { ...prev, data: [p.item, ...prev.data] };
      });
    };
    const onUpdated = (p) => {
      if (p.workspaceId !== workspace.id) return;
      qc.setQueryData(queryKey, (prev) => {
        if (!prev) return prev;
        const exists = prev.data.some((i) => i.id === p.item.id);
        if (exists) {
          return {
            ...prev,
            data: matches(p.item)
              ? prev.data.map((i) => (i.id === p.item.id ? p.item : i))
              : prev.data.filter((i) => i.id !== p.item.id),
          };
        }
        return matches(p.item) ? { ...prev, data: [p.item, ...prev.data] } : prev;
      });
    };
    const onDeleted = (p) => {
      if (p.workspaceId !== workspace.id) return;
      qc.setQueryData(queryKey, (prev) =>
        prev ? { ...prev, data: prev.data.filter((i) => i.id !== p.id) } : prev,
      );
    };
    socket.on('action-item:created', onCreated);
    socket.on('action-item:updated', onUpdated);
    socket.on('action-item:deleted', onDeleted);
    return () => {
      socket.off('action-item:created', onCreated);
      socket.off('action-item:updated', onUpdated);
      socket.off('action-item:deleted', onDeleted);
    };
  }, [socket, workspace.id, qc, queryKey, filters]);

  const moveMutation = useOptimisticMutation({
    queryKey,
    mutationFn: ({ itemId, toStatus }) =>
      api.patch(`/action-items/${itemId}`, { status: toStatus }).then((r) => r.data.item),
    optimisticUpdate: (cache, vars) => {
      if (!cache) return cache;
      return {
        ...cache,
        data: cache.data.map((i) =>
          i.id === vars.itemId ? { ...i, status: vars.toStatus } : i,
        ),
      };
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Move failed — reverted')),
  });

  const items = itemsQuery.data?.data ?? [];

  const itemsByStatus = useMemo(() => {
    /** @type {Record<string, any[]>} */
    const grouped = { TODO: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
    items.forEach((it) => {
      (grouped[it.status] ??= []).push(it);
    });
    return grouped;
  }, [items]);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Action items</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag between columns to update status. Filter and switch to a list any time.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New item
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Search title…"
            className="w-56 pl-7"
          />
        </div>
        <Select
          value={filters.assigneeId}
          onChange={(e) => setFilters((f) => ({ ...f, assigneeId: e.target.value }))}
          className="w-40"
          aria-label="Filter by assignee"
        >
          <option value="">All assignees</option>
          {(membersQuery.data ?? []).map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.name}
            </option>
          ))}
        </Select>
        <Select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          className="w-36"
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p.toLowerCase()}
            </option>
          ))}
        </Select>

        <div className="ml-auto inline-flex rounded-md border border-input bg-card p-0.5">
          <ViewToggle active={view === 'kanban'} onClick={() => setView('kanban')} icon={LayoutGrid}>
            Board
          </ViewToggle>
          <ViewToggle active={view === 'list'} onClick={() => setView('list')} icon={ListIcon}>
            List
          </ViewToggle>
        </div>
      </div>

      {itemsQuery.isLoading ? (
        <BoardSkeleton />
      ) : itemsQuery.isError ? (
        <p className="text-sm text-destructive">Failed to load action items.</p>
      ) : view === 'kanban' ? (
        <KanbanBoard
          itemsByStatus={itemsByStatus}
          onCardClick={(item) => setEditingItem(item)}
          onMove={(itemId, _from, toStatus) => moveMutation.mutate({ itemId, toStatus })}
        />
      ) : (
        <ListView items={items} onClick={(item) => setEditingItem(item)} />
      )}

      <ItemFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(item) => {
          qc.setQueryData(queryKey, (prev) => {
            if (!prev) return { data: [item], meta: { page: 1, pageSize: 100, total: 1 } };
            if (prev.data.some((i) => i.id === item.id)) return prev;
            return { ...prev, data: [item, ...prev.data] };
          });
        }}
      />

      <ItemFormDialog
        open={!!editingItem}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSaved={(item) => {
          qc.setQueryData(queryKey, (prev) =>
            prev ? { ...prev, data: prev.data.map((i) => (i.id === item.id ? item : i)) } : prev,
          );
        }}
      />
    </div>
  );
}

function ViewToggle({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {STATUS_COLUMNS.map((col) => (
        <div key={col.key} className="rounded-lg border bg-muted/20 p-2.5">
          <div className="mb-2 h-3 w-20 animate-pulse rounded bg-muted" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="mb-2 h-16 animate-pulse rounded-md bg-muted/60" />
          ))}
        </div>
      ))}
    </div>
  );
}
