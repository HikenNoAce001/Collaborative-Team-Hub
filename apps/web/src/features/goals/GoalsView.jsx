'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Target } from 'lucide-react';
import { GOAL_STATUSES } from '@team-hub/schemas';

import api from '@/lib/api';
import { useSocket } from '@/lib/socket';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { cn } from '@/lib/cn';
import GoalFormDialog from './GoalFormDialog';
import GoalDetail from './GoalDetail';

const STATUS_TONE = {
  DRAFT: 'neutral',
  ON_TRACK: 'success',
  AT_RISK: 'warning',
  COMPLETED: 'primary',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function GoalsView() {
  const { workspace } = useWorkspace();
  const qc = useQueryClient();
  const { socket } = useSocket(workspace.id);

  const [filters, setFilters] = useState({ q: '', status: '' });
  const [selectedId, setSelectedId] = useState(/** @type {string|null} */ (null));
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(/** @type {any|null} */ (null));

  const queryKey = useMemo(() => ['goals', workspace.id, filters], [workspace.id, filters]);
  const goalsQuery = useQuery({
    queryKey,
    queryFn: () =>
      api
        .get(`/workspaces/${workspace.id}/goals`, {
          params: {
            q: filters.q || undefined,
            status: filters.status || undefined,
            pageSize: 100,
          },
        })
        .then((r) => r.data),
  });

  // Realtime: keep the list in sync.
  useEffect(() => {
    if (!socket) return undefined;
    const onCreated = (p) => {
      if (p.workspaceId !== workspace.id) return;
      qc.setQueryData(queryKey, (prev) => {
        if (!prev) return prev;
        if (prev.data.some((g) => g.id === p.goal.id)) return prev;
        return { ...prev, data: [p.goal, ...prev.data] };
      });
    };
    const onUpdated = (p) => {
      if (p.workspaceId !== workspace.id) return;
      qc.setQueryData(queryKey, (prev) =>
        prev
          ? { ...prev, data: prev.data.map((g) => (g.id === p.goal.id ? { ...g, ...p.goal } : g)) }
          : prev,
      );
    };
    const onDeleted = (p) => {
      if (p.workspaceId !== workspace.id) return;
      qc.setQueryData(queryKey, (prev) =>
        prev ? { ...prev, data: prev.data.filter((g) => g.id !== p.id) } : prev,
      );
      setSelectedId((prev) => (prev === p.id ? null : prev));
    };
    socket.on('goal:created', onCreated);
    socket.on('goal:updated', onUpdated);
    socket.on('goal:deleted', onDeleted);
    return () => {
      socket.off('goal:created', onCreated);
      socket.off('goal:updated', onUpdated);
      socket.off('goal:deleted', onDeleted);
    };
  }, [socket, workspace.id, qc, queryKey]);

  const goals = goalsQuery.data?.data ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr]">
      <div className="space-y-3">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Goals</h1>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </header>

        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Search goals…"
              className="pl-7"
            />
          </div>
          <Select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {GOAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ').toLowerCase()}
              </option>
            ))}
          </Select>
        </div>

        {goalsQuery.isLoading ? (
          <ul className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="h-16 animate-pulse rounded-md bg-muted/40" />
            ))}
          </ul>
        ) : goals.length === 0 ? (
          <EmptyState
            icon={<Target className="h-7 w-7" />}
            title="No goals"
            description="Create one to start tracking milestones and updates."
          />
        ) : (
          <ul className="space-y-2">
            {goals.map((g) => {
              const active = selectedId === g.id;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(g.id)}
                    className={cn(
                      'flex w-full flex-col gap-1 rounded-md border bg-card p-3 text-left transition-colors hover:bg-accent',
                      active && 'border-primary/50 bg-primary/5',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium">{g.title}</p>
                      <Badge tone={STATUS_TONE[g.status]}>
                        {g.status.replace('_', ' ').toLowerCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {g.owner?.name ?? '—'} · due {formatDate(g.dueDate)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {g._count?.milestones ?? 0} milestones · {g._count?.actionItems ?? 0} items ·{' '}
                      {g._count?.updates ?? 0} updates
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        {selectedId ? (
          <GoalDetail
            goalId={selectedId}
            onEdit={() => setEditing(goals.find((g) => g.id === selectedId))}
            onDeleted={() => setSelectedId(null)}
          />
        ) : (
          <EmptyState
            icon={<Target className="h-7 w-7" />}
            title="Select a goal"
            description="Pick a goal on the left to see milestones, status, and the activity feed."
          />
        )}
      </div>

      <GoalFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(goal) => {
          qc.setQueryData(queryKey, (prev) => {
            if (!prev) return { data: [goal], meta: { page: 1, pageSize: 100, total: 1 } };
            if (prev.data.some((g) => g.id === goal.id)) return prev;
            return { ...prev, data: [goal, ...prev.data] };
          });
          setSelectedId(goal.id);
        }}
      />

      <GoalFormDialog
        open={!!editing}
        goal={editing}
        onClose={() => setEditing(null)}
        onSaved={(goal) => {
          qc.setQueryData(queryKey, (prev) =>
            prev
              ? { ...prev, data: prev.data.map((g) => (g.id === goal.id ? { ...g, ...goal } : g)) }
              : prev,
          );
          qc.setQueryData(['goal', goal.id], (prev) => (prev ? { ...prev, ...goal } : prev));
        }}
      />
    </div>
  );
}
