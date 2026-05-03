'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ChevronLeft,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react';

import api from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useSocket } from '@/lib/socket';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import {
  CommentsSection,
  ReactionsBar,
  apiErrorMessage,
  formatDate,
} from './AnnouncementsView';

/**
 * Standalone announcement page — shows the full post body, reactions,
 * and the comments thread on its own route. Reused for both deep links
 * (notification → /w/:id/announcements/:announcementId) and direct nav
 * (clicking a card on the list).
 *
 * @param {{ announcementId: string }} props
 */
export default function AnnouncementDetailView({ announcementId }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { workspace, isAdmin } = useWorkspace();
  const { data: me } = useMe();
  const { socket } = useSocket(workspace.id);
  const [menuOpen, setMenuOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['announcement', announcementId],
    queryFn: () => api.get(`/announcements/${announcementId}`).then((r) => r.data.announcement),
  });

  // Realtime reaction patches against the detail cache.
  useEffect(() => {
    if (!socket) return undefined;
    const onAdded = (p) => {
      if (p.announcementId !== announcementId) return;
      qc.setQueryData(['announcement', announcementId], (prev) => {
        if (!prev) return prev;
        if (prev.reactions?.some((r) => r.id === p.reaction.id)) return prev;
        return { ...prev, reactions: [...(prev.reactions ?? []), p.reaction] };
      });
    };
    const onRemoved = (p) => {
      if (p.announcementId !== announcementId) return;
      qc.setQueryData(['announcement', announcementId], (prev) =>
        prev
          ? {
              ...prev,
              reactions: (prev.reactions ?? []).filter(
                (r) => !(r.userId === p.userId && r.emoji === p.emoji),
              ),
            }
          : prev,
      );
    };
    socket.on('reaction:added', onAdded);
    socket.on('reaction:removed', onRemoved);
    return () => {
      socket.off('reaction:added', onAdded);
      socket.off('reaction:removed', onRemoved);
    };
  }, [socket, announcementId, qc]);

  const togglePin = useMutation({
    mutationFn: () => {
      const ann = detailQuery.data;
      return api.patch(`/announcements/${announcementId}`, { pinned: !ann.pinned });
    },
    onSuccess: () => toast.success(detailQuery.data?.pinned ? 'Unpinned' : 'Pinned'),
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to toggle pin')),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/announcements/${announcementId}`),
    onSuccess: () => {
      qc.setQueryData(['announcements', workspace.id], (prev) =>
        prev ? { ...prev, data: prev.data.filter((a) => a.id !== announcementId) } : prev,
      );
      toast.success('Announcement deleted');
      router.push(`/w/${workspace.id}/announcements`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete')),
  });

  const announcement = detailQuery.data;

  const reactionsByEmoji = useMemo(() => {
    /** @type {Record<string, {count:number, mine:boolean}>} */
    const map = {};
    (announcement?.reactions ?? []).forEach((r) => {
      map[r.emoji] ??= { count: 0, mine: false };
      map[r.emoji].count += 1;
      if (me && r.userId === me.id) map[r.emoji].mine = true;
    });
    return map;
  }, [announcement, me]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href={`/w/${workspace.id}/announcements`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to announcements
      </Link>

      {detailQuery.isLoading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
      ) : detailQuery.isError || !announcement ? (
        <Card className="p-6 text-sm text-destructive">Failed to load this announcement.</Card>
      ) : (
        <Card className={cn('relative', announcement.pinned && 'border-primary/40')}>
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium uppercase">
              {announcement.author?.name?.[0] ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight">{announcement.title}</h1>
                {announcement.pinned && (
                  <Badge tone="primary">
                    <Pin className="h-3 w-3" /> Pinned
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {announcement.author?.name ?? 'Unknown'} · {formatDate(announcement.createdAt)}
              </p>
            </div>
            {isAdmin && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Post actions"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {menuOpen && (
                  <>
                    <button
                      type="button"
                      aria-hidden
                      onClick={() => setMenuOpen(false)}
                      className="fixed inset-0 z-10"
                    />
                    <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border bg-popover p-1 text-sm shadow-md">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          togglePin.mutate();
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-accent"
                      >
                        {announcement.pinned ? (
                          <>
                            <PinOff className="h-3.5 w-3.5" /> Unpin
                          </>
                        ) : (
                          <>
                            <Pin className="h-3.5 w-3.5" /> Pin to top
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          if (confirm('Delete this announcement? This cannot be undone.')) {
                            remove.mutate();
                          }
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div
            className="rt-content px-4 pb-4 sm:px-5 sm:pb-5"
            dangerouslySetInnerHTML={{ __html: announcement.bodyHtml }}
          />

          <div className="border-t px-4 py-3 sm:px-5">
            <ReactionsBar
              announcementId={announcement.id}
              reactionsByEmoji={reactionsByEmoji}
            />
            <CommentsSection announcement={announcement} />
          </div>
        </Card>
      )}
    </div>
  );
}
