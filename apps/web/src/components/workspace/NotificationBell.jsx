'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { toast } from 'sonner';
import { Bell, Check, CheckCheck } from 'lucide-react';

import api from '@/lib/api';
import { useSocket } from '@/lib/socket';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { cn } from '@/lib/cn';

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function describe(n) {
  const actor = n.payload?.actor?.name ?? 'Someone';
  if (n.kind === 'mention') {
    return {
      title: `${actor} mentioned you`,
      preview: n.payload?.preview ?? '',
    };
  }
  return { title: `${actor} · ${n.kind}`, preview: n.payload?.preview ?? '' };
}

export default function NotificationBell() {
  const router = useRouter();
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  const { socket } = useSocket(workspace.id);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  const queryKey = ['notifications'];
  const listQuery = useQuery({
    queryKey,
    queryFn: () => api.get('/notifications', { params: { pageSize: 30 } }).then((r) => r.data),
    staleTime: 60_000,
  });

  // Realtime: unshift new notifications + bump unread count.
  useEffect(() => {
    if (!socket) return undefined;
    const onCreated = (p) => {
      qc.setQueryData(queryKey, (prev) => {
        if (!prev) return { data: [p.notification], meta: { nextCursor: null, unreadCount: 1 } };
        if (prev.data.some((n) => n.id === p.notification.id)) return prev;
        return {
          ...prev,
          data: [p.notification, ...prev.data],
          meta: { ...prev.meta, unreadCount: (prev.meta?.unreadCount ?? 0) + 1 },
        };
      });
      const { title, preview } = describe(p.notification);
      toast(title, { description: preview ? preview.slice(0, 80) : undefined });
    };
    socket.on('notification:created', onCreated);
    return () => socket.off('notification:created', onCreated);
  }, [socket, qc]);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (
        panelRef.current?.contains(e.target) ||
        buttonRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const markRead = useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/read`).then((r) => r.data.notification),
    onSuccess: (n) => {
      qc.setQueryData(queryKey, (prev) => {
        if (!prev) return prev;
        const wasUnread = prev.data.find((x) => x.id === n.id)?.readAt == null;
        return {
          ...prev,
          data: prev.data.map((x) => (x.id === n.id ? n : x)),
          meta: {
            ...prev.meta,
            unreadCount: Math.max(0, (prev.meta?.unreadCount ?? 0) - (wasUnread ? 1 : 0)),
          },
        };
      });
    },
    onError: () => toast.error('Failed to mark as read'),
  });

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all').then((r) => r.data),
    onSuccess: () => {
      const now = new Date().toISOString();
      qc.setQueryData(queryKey, (prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.map((n) => ({ ...n, readAt: n.readAt ?? now })),
              meta: { ...prev.meta, unreadCount: 0 },
            }
          : prev,
      );
    },
    onError: () => toast.error('Failed to mark all as read'),
  });

  const items = listQuery.data?.data ?? [];
  const unreadCount = listQuery.data?.meta?.unreadCount ?? 0;
  const [listRef] = useAutoAnimate();

  function navigateTo(n) {
    const wsId = n.payload?.workspaceId;
    if (n.kind === 'mention' && wsId) {
      router.push(`/w/${wsId}/announcements`);
    }
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-elevated"
        >
          <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
            <span className="font-medium">
              Notifications {unreadCount > 0 && <span className="text-muted-foreground">· {unreadCount} unread</span>}
            </span>
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending || unreadCount === 0}
              className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all
            </button>
          </div>

          <ul ref={listRef} className="max-h-96 overflow-y-auto">
            {listQuery.isLoading ? (
              <li className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</li>
            ) : items.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                You’re all caught up.
              </li>
            ) : (
              items.map((n) => {
                const { title, preview } = describe(n);
                const unread = n.readAt == null;
                return (
                  <li key={n.id} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (unread) markRead.mutate(n.id);
                        navigateTo(n);
                      }}
                      className={cn(
                        'flex w-full gap-2 px-3 py-2.5 text-left text-xs transition-colors hover:bg-accent',
                        unread && 'bg-primary/5',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                          unread ? 'bg-primary' : 'bg-transparent',
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{title}</p>
                        {preview && (
                          <p className="line-clamp-2 text-muted-foreground">{preview}</p>
                        )}
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                      {unread && (
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-card">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
