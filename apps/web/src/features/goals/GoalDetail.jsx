'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle2,
  ChevronDown,
  Edit3,
  ListChecks,
  MessageSquare,
  Plus,
  Send,
  Target,
  Trash2,
} from 'lucide-react';
import { GOAL_STATUSES } from '@team-hub/schemas';

import api from '@/lib/api';
import { useSocket } from '@/lib/socket';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { useMe } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Dialog from '@/components/ui/Dialog';
import { cn } from '@/lib/cn';

const STATUS_TONE = {
  DRAFT: 'neutral',
  ON_TRACK: 'success',
  AT_RISK: 'warning',
  COMPLETED: 'primary',
};

function apiErrorMessage(err, fallback) {
  return err?.response?.data?.error?.message ?? fallback;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function relativeDate(iso) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * @param {{
 *   goalId: string,
 *   onEdit: () => void,
 *   onDeleted: () => void,
 * }} props
 */
export default function GoalDetail({ goalId, onEdit, onDeleted }) {
  const { workspace, isAdmin } = useWorkspace();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { socket } = useSocket(workspace.id);
  const [milestoneOpen, setMilestoneOpen] = useState(false);

  const goalQuery = useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => api.get(`/goals/${goalId}`).then((r) => r.data.goal),
  });

  const updatesQuery = useQuery({
    queryKey: ['goal-updates', goalId],
    queryFn: () =>
      api.get(`/goals/${goalId}/updates`, { params: { pageSize: 20 } }).then((r) => r.data),
  });

  // Realtime: milestones, status changes, new updates.
  useEffect(() => {
    if (!socket) return undefined;
    const onUpdated = (p) => {
      if (p.goal.id !== goalId) return;
      qc.setQueryData(['goal', goalId], (prev) => (prev ? { ...prev, ...p.goal } : prev));
    };
    const onMilestone = (p) => {
      if (p.goalId !== goalId) return;
      qc.setQueryData(['goal', goalId], (prev) => {
        if (!prev) return prev;
        if (prev.milestones?.some((m) => m.id === p.milestone.id)) return prev;
        return { ...prev, milestones: [...(prev.milestones ?? []), p.milestone] };
      });
    };
    const onUpdate = (p) => {
      if (p.goalId !== goalId) return;
      qc.setQueryData(['goal-updates', goalId], (prev) => {
        if (!prev) return prev;
        if (prev.data.some((u) => u.id === p.update.id)) return prev;
        return { ...prev, data: [p.update, ...prev.data] };
      });
    };
    socket.on('goal:updated', onUpdated);
    socket.on('milestone:created', onMilestone);
    socket.on('goal-update:created', onUpdate);
    return () => {
      socket.off('goal:updated', onUpdated);
      socket.off('milestone:created', onMilestone);
      socket.off('goal-update:created', onUpdate);
    };
  }, [socket, goalId, qc]);

  const remove = useMutation({
    mutationFn: () => api.delete(`/goals/${goalId}`),
    onSuccess: () => {
      toast.success('Goal deleted');
      onDeleted();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete')),
  });

  const goal = goalQuery.data;
  const canEdit = goal && (isAdmin || goal.ownerId === me?.id);

  const progress = useMemo(() => {
    const ms = goal?.milestones ?? [];
    if (ms.length === 0) return null;
    const total = ms.reduce((sum, m) => sum + (m.progress ?? 0), 0);
    return Math.round(total / ms.length);
  }, [goal]);

  if (goalQuery.isLoading) return <p className="text-sm text-muted-foreground">Loading goal…</p>;
  if (goalQuery.isError || !goal) return <p className="text-sm text-destructive">Failed to load goal.</p>;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{goal.title}</h2>
            <Badge tone={STATUS_TONE[goal.status]}>{goal.status.replace('_', ' ').toLowerCase()}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Owner: {goal.owner?.name ?? '—'} · Due {formatDate(goal.dueDate)}
          </p>
          {goal.description && (
            <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
              {goal.description}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onEdit}>
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('Delete this goal? Linked items keep their reference but lose the link.')) {
                  remove.mutate();
                }
              }}
              loading={remove.isPending}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        )}
      </header>

      <StatusQuickChange goal={goal} canEdit={canEdit} />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              Milestones {progress !== null && <span className="text-muted-foreground">— {progress}% avg</span>}
            </h3>
          </div>
          {canEdit && (
            <Button size="sm" variant="ghost" onClick={() => setMilestoneOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          )}
        </div>
        {(goal.milestones ?? []).length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
            No milestones yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {goal.milestones.map((m) => (
              <MilestoneRow key={m.id} milestone={m} canEdit={canEdit} goalId={goalId} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Activity</h3>
        </div>
        <ActivityFeed goalId={goalId} updatesQuery={updatesQuery} />
      </section>

      <MilestoneDialog
        open={milestoneOpen}
        onClose={() => setMilestoneOpen(false)}
        goalId={goalId}
      />
    </div>
  );
}

function StatusQuickChange({ goal, canEdit }) {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();

  const mutation = useMutation({
    mutationFn: (status) => api.patch(`/goals/${goal.id}`, { status }).then((r) => r.data.goal),
    onSuccess: (updated) => {
      qc.setQueryData(['goal', goal.id], (prev) => (prev ? { ...prev, ...updated } : prev));
      qc.setQueryData(['goals', workspace.id], (prev) => {
        if (!prev) return prev;
        return { ...prev, data: prev.data.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)) };
      });
      toast.success(`Status set to ${updated.status.replace('_', ' ').toLowerCase()}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to change status')),
  });

  if (!canEdit) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
      <span className="text-muted-foreground">Quick status:</span>
      {GOAL_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => {
            if (s !== goal.status) mutation.mutate(s);
          }}
          className={cn(
            'rounded-full border px-2 py-0.5 transition-colors',
            goal.status === s
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-input hover:bg-accent',
          )}
        >
          {s.replace('_', ' ').toLowerCase()}
        </button>
      ))}
    </div>
  );
}

function MilestoneRow({ milestone, canEdit, goalId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [progress, setProgress] = useState(milestone.progress);
  const [title, setTitle] = useState(milestone.title);

  const update = useMutation({
    mutationFn: (data) => api.patch(`/milestones/${milestone.id}`, data).then((r) => r.data.milestone),
    onSuccess: (m) => {
      qc.setQueryData(['goal', goalId], (prev) =>
        prev
          ? { ...prev, milestones: prev.milestones.map((x) => (x.id === m.id ? m : x)) }
          : prev,
      );
      setEditing(false);
      toast.success('Milestone updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to update milestone')),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/milestones/${milestone.id}`),
    onSuccess: () => {
      qc.setQueryData(['goal', goalId], (prev) =>
        prev
          ? { ...prev, milestones: prev.milestones.filter((x) => x.id !== milestone.id) }
          : prev,
      );
      toast.success('Milestone removed');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to remove milestone')),
  });

  return (
    <li className="rounded-md border bg-card p-3">
      {editing ? (
        <div className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8" />
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-9 text-xs tabular-nums">{progress}%</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setProgress(milestone.progress);
                setTitle(milestone.title);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" loading={update.isPending} onClick={() => update.mutate({ title, progress })}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {milestone.progress >= 100 ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Target className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{milestone.title}</p>
              <span className="text-xs tabular-nums text-muted-foreground">{milestone.progress}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  milestone.progress >= 100 ? 'bg-emerald-500' : 'bg-primary',
                )}
                style={{ width: `${milestone.progress}%` }}
              />
            </div>
          </div>
          {canEdit && (
            <div className="flex shrink-0 gap-1">
              <Button size="icon" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit milestone">
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (confirm(`Remove milestone "${milestone.title}"?`)) remove.mutate();
                }}
                loading={remove.isPending}
                aria-label="Remove milestone"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function MilestoneDialog({ open, onClose, goalId }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [progress, setProgress] = useState(0);

  const create = useMutation({
    mutationFn: () =>
      api.post(`/goals/${goalId}/milestones`, { title, progress }).then((r) => r.data.milestone),
    onSuccess: (m) => {
      qc.setQueryData(['goal', goalId], (prev) => {
        if (!prev) return prev;
        if (prev.milestones?.some((x) => x.id === m.id)) return prev;
        return { ...prev, milestones: [...(prev.milestones ?? []), m] };
      });
      setTitle('');
      setProgress(0);
      onClose();
      toast.success('Milestone added');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to add milestone')),
  });

  return (
    <Dialog open={open} onClose={onClose} title="Add milestone">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          create.mutate();
        }}
        className="space-y-3"
      >
        <div>
          <label className="text-xs font-medium">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            placeholder="Beta release"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium">Initial progress</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-9 text-xs tabular-nums">{progress}%</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending} disabled={!title.trim()}>
            Add
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ActivityFeed({ goalId, updatesQuery }) {
  const qc = useQueryClient();
  const [composing, setComposing] = useState('');

  const post = useMutation({
    mutationFn: (body) => api.post(`/goals/${goalId}/updates`, { body }).then((r) => r.data.update),
    onSuccess: (update) => {
      qc.setQueryData(['goal-updates', goalId], (prev) => {
        if (!prev) return { data: [update], meta: { nextCursor: null } };
        if (prev.data.some((u) => u.id === update.id)) return prev;
        return { ...prev, data: [update, ...prev.data] };
      });
      setComposing('');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to post update')),
  });

  const updates = updatesQuery.data?.data ?? [];
  const nextCursor = updatesQuery.data?.meta?.nextCursor ?? null;

  async function loadOlder() {
    if (!nextCursor) return;
    const res = await api
      .get(`/goals/${goalId}/updates`, { params: { pageSize: 20, before: nextCursor } })
      .then((r) => r.data);
    qc.setQueryData(['goal-updates', goalId], (prev) =>
      prev ? { ...prev, data: [...prev.data, ...res.data], meta: res.meta } : res,
    );
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!composing.trim()) return;
          post.mutate(composing);
        }}
        className="space-y-2"
      >
        <Textarea
          value={composing}
          onChange={(e) => setComposing(e.target.value)}
          placeholder="Post an update — "
          rows={2}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={post.isPending} disabled={!composing.trim()}>
            <Send className="h-3.5 w-3.5" />
            Post
          </Button>
        </div>
      </form>

      {updatesQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading activity…</p>
      ) : updates.length === 0 ? (
        <p className="text-xs text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="space-y-2">
          {updates.map((u) => (
            <li key={u.id} className="rounded-md border bg-card p-3 text-sm">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{u.author?.name ?? 'Unknown'}</span>
                {' · '}
                {relativeDate(u.createdAt)}
                {u.kind !== 'post' && (
                  <Badge tone="info" className="ml-2">
                    {u.kind.replace('_', ' ')}
                  </Badge>
                )}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{u.body}</p>
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={loadOlder}>
            <ChevronDown className="h-3.5 w-3.5" />
            Load older
          </Button>
        </div>
      )}
    </div>
  );
}
