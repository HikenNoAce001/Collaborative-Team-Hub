'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { toast } from 'sonner';
import {
  AtSign,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Send,
  Smile,
  Trash2,
} from 'lucide-react';
import { createAnnouncementSchema } from '@team-hub/schemas';

import api from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useSocket } from '@/lib/socket';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import Dialog from '@/components/ui/Dialog';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import Editor from './Editor';

export const REACTIONS = ['👍', '❤️', '🚀'];

export function apiErrorMessage(err, fallback) {
  return err?.response?.data?.error?.message ?? fallback;
}

// Strip tags + entities so the list card preview doesn't blow up
// when the body contains lists or headings — line-clamp on
// rich-text HTML produces overflow artifacts.
export function htmlToExcerpt(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AnnouncementsView() {
  const { workspace, isAdmin } = useWorkspace();
  const qc = useQueryClient();
  const { socket } = useSocket(workspace.id);
  const [composerOpen, setComposerOpen] = useState(false);
  const [feedRef] = useAutoAnimate();

  const listQuery = useQuery({
    queryKey: ['announcements', workspace.id],
    queryFn: () =>
      api
        .get(`/workspaces/${workspace.id}/announcements`, { params: { pageSize: 50 } })
        .then((r) => r.data),
  });

  // Realtime: server pushes the freshest announcement on create/update/delete.
  useEffect(() => {
    if (!socket) return undefined;
    const onCreated = (p) => {
      if (p.workspaceId !== workspace.id) return;
      qc.setQueryData(['announcements', workspace.id], (prev) => {
        if (!prev) return prev;
        if (prev.data.some((a) => a.id === p.announcement.id)) return prev;
        return { ...prev, data: [p.announcement, ...prev.data] };
      });
    };
    const onUpdated = (p) => {
      if (p.workspaceId !== workspace.id) return;
      qc.setQueryData(['announcements', workspace.id], (prev) =>
        prev
          ? { ...prev, data: prev.data.map((a) => (a.id === p.announcement.id ? { ...a, ...p.announcement } : a)) }
          : prev,
      );
    };
    const onDeleted = (p) => {
      if (p.workspaceId !== workspace.id) return;
      qc.setQueryData(['announcements', workspace.id], (prev) =>
        prev ? { ...prev, data: prev.data.filter((a) => a.id !== p.id) } : prev,
      );
    };
    socket.on('announcement:created', onCreated);
    socket.on('announcement:updated', onUpdated);
    socket.on('announcement:deleted', onDeleted);
    return () => {
      socket.off('announcement:created', onCreated);
      socket.off('announcement:updated', onUpdated);
      socket.off('announcement:deleted', onDeleted);
    };
  }, [socket, workspace.id, qc]);

  const items = listQuery.data?.data ?? [];

  // Sort: pinned first then newest. Server already returns this order; we re-sort
  // after optimistic updates / realtime patches keep it stable.
  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [items],
  );

  // Scroll to a specific announcement when navigating from a notification link.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [sorted]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspace-wide updates from your admins.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setComposerOpen(true)}>
            <Plus className="h-4 w-4" />
            New post
          </Button>
        )}
      </header>

      {listQuery.isLoading ? (
        <CardSkeleton rows={3} />
      ) : listQuery.isError ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            Failed to load announcements.
          </CardContent>
        </Card>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-8 w-8" />}
          title="No announcements yet"
          description={isAdmin ? 'Be the first to post an update.' : 'Your admins haven’t posted anything yet.'}
          action={
            isAdmin && (
              <Button onClick={() => setComposerOpen(true)} size="sm">
                Write the first post
              </Button>
            )
          }
        />
      ) : (
        <ul ref={feedRef} className="space-y-3">
          {sorted.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </ul>
      )}

      {isAdmin && (
        <ComposerDialog
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          workspaceId={workspace.id}
        />
      )}
    </div>
  );
}

function ComposerDialog({ open, onClose, workspaceId }) {
  const qc = useQueryClient();
  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: { title: '', body: '', pinned: false },
  });

  async function onSubmit(values) {
    try {
      const res = await api.post(`/workspaces/${workspaceId}/announcements`, values);
      qc.setQueryData(['announcements', workspaceId], (prev) => {
        const announcement = res.data.announcement;
        if (!prev) return { data: [announcement], meta: { page: 1, pageSize: 50, total: 1 } };
        if (prev.data.some((a) => a.id === announcement.id)) return prev;
        return { ...prev, data: [announcement, ...prev.data] };
      });
      reset();
      onClose();
      toast.success('Announcement posted');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to post announcement'));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New announcement"
      widthClassName="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label htmlFor="ann-title" className="text-xs font-medium">
            Title
          </label>
          <Input
            id="ann-title"
            autoFocus
            placeholder="Q2 Roadmap is live"
            {...register('title')}
            className="mt-1"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium">Body</p>
          <Controller
            control={control}
            name="body"
            render={({ field }) => (
              <div className="mt-1">
                <Editor value={field.value} onChange={field.onChange} placeholder="Write the announcement…" />
              </div>
            )}
          />
          {errors.body && (
            <p className="mt-1 text-xs text-destructive">{errors.body.message}</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('pinned')} className="h-4 w-4" />
          Pin to top
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Post
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function AnnouncementCard({ announcement }) {
  const { workspace, isAdmin } = useWorkspace();
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const togglePin = useMutation({
    mutationFn: () => api.patch(`/announcements/${announcement.id}`, { pinned: !announcement.pinned }),
    onSuccess: () => toast.success(announcement.pinned ? 'Unpinned' : 'Pinned'),
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to toggle pin')),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/announcements/${announcement.id}`),
    onSuccess: () => {
      qc.setQueryData(['announcements', workspace.id], (prev) =>
        prev ? { ...prev, data: prev.data.filter((a) => a.id !== announcement.id) } : prev,
      );
      toast.success('Announcement deleted');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete')),
  });

  const detailHref = `/w/${workspace.id}/announcements/${announcement.id}`;

  return (
    <Card
      id={`ann-${announcement.id}`}
      className={cn('relative transition-shadow hover:shadow-md', announcement.pinned && 'border-primary/40')}
    >
      <Link href={detailHref} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium uppercase">
            {announcement.author?.name?.[0] ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight">{announcement.title}</h2>
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
        </div>

        <p className="line-clamp-2 px-4 pb-4 text-sm text-muted-foreground sm:px-5 sm:pb-5">
          {htmlToExcerpt(announcement.bodyHtml)}
        </p>

        <div className="flex flex-wrap items-center gap-3 border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground sm:px-5">
          <span className="inline-flex items-center gap-1">
            <Smile className="h-3.5 w-3.5" />
            {announcement._count?.reactions ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {announcement._count?.comments ?? 0}
          </span>
          <span className="ml-auto font-medium text-primary">Open →</span>
        </div>
      </Link>

      {isAdmin && (
        <div className="absolute right-3 top-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Post actions"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {menuOpen && (
            <>
              <button
                type="button"
                aria-hidden
                onClick={(e) => {
                  e.preventDefault();
                  setMenuOpen(false);
                }}
                className="fixed inset-0 z-10"
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border bg-popover p-1 text-sm shadow-md">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
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
                  onClick={(e) => {
                    e.preventDefault();
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
    </Card>
  );
}

export function ReactionsBar({ announcementId, reactionsByEmoji }) {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  const { data: me } = useMe();

  const toggle = useMutation({
    mutationFn: async (emoji) => {
      const mine = reactionsByEmoji[emoji]?.mine;
      if (mine) {
        await api.delete(`/announcements/${announcementId}/reactions/${encodeURIComponent(emoji)}`);
        return { emoji, removed: true };
      }
      const res = await api.post(`/announcements/${announcementId}/reactions`, { emoji });
      return { emoji, removed: false, reaction: res.data.reaction };
    },
    onSuccess: (result) => {
      qc.setQueryData(['announcement', announcementId], (prev) => {
        if (!prev) return prev;
        if (result.removed) {
          return {
            ...prev,
            reactions: (prev.reactions ?? []).filter(
              (r) => !(r.userId === me?.id && r.emoji === result.emoji),
            ),
          };
        }
        const reaction = result.reaction;
        if (prev.reactions?.some((r) => r.id === reaction.id)) return prev;
        return { ...prev, reactions: [...(prev.reactions ?? []), reaction] };
      });
      // Bump the parent list count so the badge reflects reality immediately.
      qc.setQueryData(['announcements', workspace.id], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((a) => {
            if (a.id !== announcementId) return a;
            const delta = result.removed ? -1 : 1;
            return {
              ...a,
              _count: { ...a._count, reactions: Math.max(0, (a._count?.reactions ?? 0) + delta) },
            };
          }),
        };
      });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to toggle reaction')),
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTIONS.map((emoji) => {
        const r = reactionsByEmoji[emoji];
        const mine = r?.mine;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle.mutate(emoji)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-colors',
              mine
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-input hover:bg-accent',
            )}
            aria-pressed={mine}
          >
            <span>{emoji}</span>
            <span className="text-xs">{r?.count ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

export function CommentsSection({ announcement }) {
  const { workspace } = useWorkspace();
  const qc = useQueryClient();
  const { socket } = useSocket(workspace.id);
  const [threadRef] = useAutoAnimate();

  const membersQuery = useQuery({
    queryKey: ['members', workspace.id],
    queryFn: () => api.get(`/workspaces/${workspace.id}/members`).then((r) => r.data.members),
  });

  const commentsQuery = useQuery({
    queryKey: ['comments', announcement.id],
    queryFn: () =>
      api.get(`/announcements/${announcement.id}/comments`, { params: { pageSize: 20 } }).then((r) => r.data),
  });

  // Realtime: prepend new comments + patch updates / deletes.
  useEffect(() => {
    if (!socket) return undefined;
    const onCreated = (p) => {
      if (p.announcementId !== announcement.id) return;
      qc.setQueryData(['comments', announcement.id], (prev) => {
        if (!prev) return prev;
        if (prev.data.some((c) => c.id === p.comment.id)) return prev;
        return { ...prev, data: [p.comment, ...prev.data] };
      });
      qc.setQueryData(['announcements', workspace.id], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((a) =>
            a.id === announcement.id
              ? { ...a, _count: { ...a._count, comments: (a._count?.comments ?? 0) + 1 } }
              : a,
          ),
        };
      });
    };
    const onUpdated = (p) => {
      if (p.announcementId !== announcement.id) return;
      qc.setQueryData(['comments', announcement.id], (prev) =>
        prev
          ? { ...prev, data: prev.data.map((c) => (c.id === p.comment.id ? p.comment : c)) }
          : prev,
      );
    };
    const onDeleted = (p) => {
      if (p.announcementId !== announcement.id) return;
      qc.setQueryData(['comments', announcement.id], (prev) =>
        prev ? { ...prev, data: prev.data.filter((c) => c.id !== p.id) } : prev,
      );
      qc.setQueryData(['announcements', workspace.id], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((a) =>
            a.id === announcement.id
              ? { ...a, _count: { ...a._count, comments: Math.max(0, (a._count?.comments ?? 1) - 1) } }
              : a,
          ),
        };
      });
    };
    socket.on('comment:created', onCreated);
    socket.on('comment:updated', onUpdated);
    socket.on('comment:deleted', onDeleted);
    return () => {
      socket.off('comment:created', onCreated);
      socket.off('comment:updated', onUpdated);
      socket.off('comment:deleted', onDeleted);
    };
  }, [socket, announcement.id, qc, workspace.id]);

  const comments = commentsQuery.data?.data ?? [];
  const nextCursor = commentsQuery.data?.meta?.nextCursor ?? null;

  async function loadOlder() {
    if (!nextCursor) return;
    const res = await api
      .get(`/announcements/${announcement.id}/comments`, { params: { pageSize: 20, before: nextCursor } })
      .then((r) => r.data);
    qc.setQueryData(['comments', announcement.id], (prev) => {
      if (!prev) return res;
      return { ...prev, data: [...prev.data, ...res.data], meta: res.meta };
    });
  }

  return (
    <div className="mt-4 space-y-3">
      {commentsQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading comments…</p>
      ) : commentsQuery.isError ? (
        <p className="text-xs text-destructive">Failed to load comments.</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      ) : (
        <ul ref={threadRef} className="space-y-2.5">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              announcementId={announcement.id}
              workspaceId={workspace.id}
            />
          ))}
        </ul>
      )}

      {nextCursor && (
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={loadOlder}>
            Load older
          </Button>
        </div>
      )}

      <CommentInput
        announcementId={announcement.id}
        members={membersQuery.data ?? []}
      />
    </div>
  );
}

function CommentItem({ comment, announcementId, workspaceId }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { isAdmin } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const isAuthor = me?.id === comment.authorId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;

  const update = useMutation({
    mutationFn: () => api.patch(`/comments/${comment.id}`, { body: draft.trim() }).then((r) => r.data.comment),
    onSuccess: (updated) => {
      qc.setQueryData(['comments', announcementId], (prev) =>
        prev ? { ...prev, data: prev.data.map((c) => (c.id === updated.id ? updated : c)) } : prev,
      );
      setEditing(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to update comment')),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/comments/${comment.id}`),
    onSuccess: () => {
      qc.setQueryData(['comments', announcementId], (prev) =>
        prev ? { ...prev, data: prev.data.filter((c) => c.id !== comment.id) } : prev,
      );
      qc.setQueryData(['announcements', workspaceId], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((a) =>
            a.id === announcementId
              ? { ...a, _count: { ...a._count, comments: Math.max(0, (a._count?.comments ?? 1) - 1) } }
              : a,
          ),
        };
      });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete comment')),
  });

  return (
    <li className="group flex items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
        {comment.author?.name?.[0] ?? '?'}
      </div>
      <div className="min-w-0 flex-1 rounded-md bg-muted/40 px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{comment.author?.name ?? 'Unknown'}</span>
            {' · '}
            {formatDate(comment.createdAt)}
          </p>
          {(canEdit || canDelete) && !editing && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(comment.body);
                    setEditing(true);
                  }}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  aria-label="Edit comment"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete this comment?')) remove.mutate();
                  }}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim() || draft.trim() === comment.body) {
                setEditing(false);
                return;
              }
              update.mutate();
            }}
            className="mt-1 space-y-1.5"
          >
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              autoFocus
              className="bg-card"
            />
            <div className="flex items-center gap-1.5">
              <Button type="submit" size="sm" loading={update.isPending} disabled={!draft.trim()}>
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap text-sm">{comment.body}</p>
        )}
      </div>
    </li>
  );
}

function CommentInput({ announcementId, members }) {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  const { data: me } = useMe();
  const [body, setBody] = useState('');
  const [mentionIds, setMentionIds] = useState(/** @type {Set<string>} */ (new Set()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const textareaRef = useRef(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionAnchor, setMentionAnchor] = useState(/** @type {number|null} */ (null));
  const [inlineMentionOpen, setInlineMentionOpen] = useState(false);

  const candidates = useMemo(
    () => members.filter((m) => m.user.id !== me?.id),
    [members, me?.id],
  );

  const submit = useMutation({
    mutationFn: () =>
      api.post(`/announcements/${announcementId}/comments`, {
        body,
        mentionUserIds: Array.from(mentionIds),
      }),
    onSuccess: (res) => {
      const comment = res.data.comment;
      qc.setQueryData(['comments', announcementId], (prev) => {
        if (!prev) return { data: [comment], meta: { nextCursor: null } };
        if (prev.data.some((c) => c.id === comment.id)) return prev;
        return { ...prev, data: [comment, ...prev.data] };
      });
      qc.setQueryData(['announcements', workspace.id], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((a) =>
            a.id === announcementId
              ? { ...a, _count: { ...a._count, comments: (a._count?.comments ?? 0) + 1 } }
              : a,
          ),
        };
      });
      setBody('');
      setMentionIds(new Set());
      setPickerOpen(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to post comment')),
  });

  function toggleMention(id) {
    setMentionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const mentionedNames = candidates
    .filter((m) => mentionIds.has(m.user.id))
    .map((m) => m.user.name);

  const filteredForInline = useMemo(
    () => candidates.filter((m) =>
      m.user.name.toLowerCase().includes(mentionQuery.toLowerCase())
    ),
    [candidates, mentionQuery],
  );

  function handleBodyChange(e) {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    setBody(val);
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@([^\s@]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionAnchor(cursor - match[0].length);
      setInlineMentionOpen(true);
    } else {
      setInlineMentionOpen(false);
      setMentionQuery('');
      setMentionAnchor(null);
    }
  }

  function selectInlineMention(member) {
    if (mentionAnchor === null) return;
    const cursor = textareaRef.current?.selectionStart ?? body.length;
    const newBody = body.slice(0, mentionAnchor) + `@${member.user.name} ` + body.slice(cursor);
    setBody(newBody);
    if (!mentionIds.has(member.user.id)) toggleMention(member.user.id);
    setInlineMentionOpen(false);
    setMentionQuery('');
    setMentionAnchor(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        submit.mutate();
      }}
      className="space-y-2"
    >
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={handleBodyChange}
          onKeyDown={(e) => {
            if (inlineMentionOpen && e.key === 'Escape') {
              setInlineMentionOpen(false);
              e.stopPropagation();
            }
          }}
          placeholder="Write a comment… type @ to mention"
          rows={2}
        />
        {inlineMentionOpen && filteredForInline.length > 0 && (
          <div className="absolute bottom-full left-0 z-30 mb-1 w-56 overflow-hidden rounded-md border bg-popover shadow-elevated">
            {filteredForInline.map((m) => (
              <button
                key={m.user.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectInlineMention(m);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
              >
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold uppercase text-primary">
                  {m.user.name[0]}
                </span>
                {m.user.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {mentionedNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-muted-foreground">Notifying:</span>
          {mentionedNames.map((n) => (
            <Badge key={n} tone="info">
              @{n}
            </Badge>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPickerOpen((v) => !v)}
            disabled={candidates.length === 0}
          >
            <AtSign className="h-3.5 w-3.5" />
            Mention {mentionIds.size > 0 && `(${mentionIds.size})`}
          </Button>
          {pickerOpen && candidates.length > 0 && (
            <>
              <button
                type="button"
                aria-hidden
                onClick={() => setPickerOpen(false)}
                className="fixed inset-0 z-10"
              />
              <div className="absolute bottom-full left-0 z-20 mb-1 max-h-60 w-56 overflow-y-auto rounded-md border bg-popover p-1 text-sm shadow-md">
                {candidates.map((m) => {
                  const checked = mentionIds.has(m.user.id);
                  return (
                    <label
                      key={m.user.id}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMention(m.user.id)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="truncate">{m.user.name}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <Button type="submit" size="sm" loading={submit.isPending} disabled={!body.trim()}>
          <Send className="h-3.5 w-3.5" />
          Post
        </Button>
      </div>
    </form>
  );
}

function CardSkeleton({ rows = 2 }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="rounded-lg border bg-card p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-muted/60" />
              <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted/40" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted/40" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
