'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { ChevronDown, ChevronRight, Download, ScrollText } from 'lucide-react';
import { ENTITY_TYPES } from '@team-hub/schemas';
import { AuditAction } from '@team-hub/schemas';

import api from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

const ACTION_TONE = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  PIN: 'primary',
  UNPIN: 'neutral',
  INVITE: 'info',
  ACCEPT_INVITE: 'success',
  REVOKE_INVITE: 'warning',
  ROLE_CHANGE: 'warning',
  REMOVE_MEMBER: 'danger',
};

const ACTIONS = AuditAction.options;

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function downloadAuditCsv(workspaceId) {
  const res = await api.get(`/workspaces/${workspaceId}/export/audit.csv`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'audit.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AuditView() {
  const { workspace } = useWorkspace();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ action: '', entityType: '', actorId: '' });
  const [logsRef] = useAutoAnimate();

  const membersQuery = useQuery({
    queryKey: ['members', workspace.id],
    queryFn: () => api.get(`/workspaces/${workspace.id}/members`).then((r) => r.data.members),
  });

  const queryKey = useMemo(() => ['audit-logs', workspace.id, filters], [workspace.id, filters]);
  const logsQuery = useQuery({
    queryKey,
    queryFn: () =>
      api
        .get(`/workspaces/${workspace.id}/audit-logs`, {
          params: {
            action: filters.action || undefined,
            entityType: filters.entityType || undefined,
            actorId: filters.actorId || undefined,
            pageSize: 50,
          },
        })
        .then((r) => r.data),
  });

  const logs = logsQuery.data?.data ?? [];
  const nextCursor = logsQuery.data?.meta?.nextCursor ?? null;

  async function loadOlder() {
    if (!nextCursor) return;
    const res = await api
      .get(`/workspaces/${workspace.id}/audit-logs`, {
        params: {
          action: filters.action || undefined,
          entityType: filters.entityType || undefined,
          actorId: filters.actorId || undefined,
          pageSize: 50,
          before: nextCursor,
        },
      })
      .then((r) => r.data);
    qc.setQueryData(queryKey, (prev) =>
      prev ? { ...prev, data: [...prev.data, ...res.data], meta: res.meta } : res,
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin-only timeline of every state-changing action in the workspace.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => downloadAuditCsv(workspace.id)}>
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.action}
          onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
          aria-label="Filter by action"
          className="w-44"
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a.replace('_', ' ').toLowerCase()}
            </option>
          ))}
        </Select>
        <Select
          value={filters.entityType}
          onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
          aria-label="Filter by entity"
          className="w-40"
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select
          value={filters.actorId}
          onChange={(e) => setFilters((f) => ({ ...f, actorId: e.target.value }))}
          aria-label="Filter by actor"
          className="w-44"
        >
          <option value="">All actors</option>
          {(membersQuery.data ?? []).map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.name}
            </option>
          ))}
        </Select>
        {(filters.action || filters.entityType || filters.actorId) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ action: '', entityType: '', actorId: '' })}
          >
            Clear
          </Button>
        )}
      </div>

      {logsQuery.isLoading ? (
        <ul className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="h-14 animate-pulse rounded-md bg-muted/40" />
          ))}
        </ul>
      ) : logsQuery.isError ? (
        <p className="text-sm text-destructive">Failed to load audit logs.</p>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-8 w-8" />}
          title="No audit entries"
          description="Activity will appear here as your workspace changes."
        />
      ) : (
        <Card>
          <CardContent className="p-0 sm:p-0">
            <ul ref={logsRef} className="divide-y">
              {logs.map((log) => (
                <AuditRow key={log.id} log={log} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {nextCursor && (
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={loadOlder}>
            Load older
          </Button>
        </div>
      )}
    </div>
  );
}

function AuditRow({ log }) {
  const [open, setOpen] = useState(false);
  const hasDiff = log.before != null || log.after != null;

  return (
    <li className="px-4 py-3 text-sm">
      <button
        type="button"
        onClick={() => hasDiff && setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 text-left',
          hasDiff && 'cursor-pointer',
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase">
          {log.actor?.name?.[0] ?? '?'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">{log.actor?.name ?? 'Unknown'}</span>
            <Badge tone={ACTION_TONE[log.action] ?? 'neutral'}>
              {log.action.replace('_', ' ').toLowerCase()}
            </Badge>
            <span className="text-muted-foreground">{log.entityType}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{log.entityId.slice(0, 10)}…</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatTime(log.createdAt)}</p>
        </div>
        {hasDiff && (
          <span className="shrink-0 text-muted-foreground">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        )}
      </button>

      {open && hasDiff && (
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          <DiffPane label="Before" value={log.before} tone="danger" />
          <DiffPane label="After" value={log.after} tone="success" />
        </div>
      )}
    </li>
  );
}

function DiffPane({ label, value, tone }) {
  const isEmpty = value == null;
  return (
    <div
      className={cn(
        'rounded-md border p-2',
        tone === 'danger' ? 'border-destructive/30 bg-destructive/5' : 'border-emerald-500/30 bg-emerald-500/5',
      )}
    >
      <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {isEmpty ? (
        <p className="text-xs italic text-muted-foreground">—</p>
      ) : (
        <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-snug">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}
