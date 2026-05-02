'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Check, Copy, Trash2, UserPlus } from 'lucide-react';
import { createInvitationSchema } from '@team-hub/schemas';

import api from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Dialog from '@/components/ui/Dialog';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

function formatJoined(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatExpiry(iso) {
  const d = new Date(iso);
  const days = Math.max(0, Math.round((d.getTime() - Date.now()) / 86_400_000));
  return days <= 0 ? 'expired' : `expires in ${days}d`;
}

function apiErrorMessage(err, fallback) {
  return err?.response?.data?.error?.message ?? fallback;
}

export default function MembersView() {
  const { workspace, online, isAdmin } = useWorkspace();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revealedToken, setRevealedToken] = useState(/** @type {{token: string, email: string}|null} */ (null));

  const membersQuery = useQuery({
    queryKey: ['members', workspace.id],
    queryFn: () => api.get(`/workspaces/${workspace.id}/members`).then((r) => r.data.members),
  });

  const invitationsQuery = useQuery({
    queryKey: ['invitations', workspace.id],
    queryFn: () => api.get(`/workspaces/${workspace.id}/invitations`).then((r) => r.data.invitations),
    enabled: isAdmin,
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) =>
      api.patch(`/workspaces/${workspace.id}/members/${userId}`, { role }).then((r) => r.data.member),
    onSuccess: (member) => {
      qc.setQueryData(['members', workspace.id], (prev = []) =>
        prev.map((m) => (m.user.id === member.user.id ? member : m)),
      );
      toast.success(`Role updated to ${member.role.toLowerCase()}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to update role')),
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => api.delete(`/workspaces/${workspace.id}/members/${userId}`),
    onSuccess: (_, userId) => {
      qc.setQueryData(['members', workspace.id], (prev = []) => prev.filter((m) => m.user.id !== userId));
      toast.success('Member removed');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to remove member')),
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => api.delete(`/invitations/${id}`),
    onSuccess: (_, id) => {
      qc.setQueryData(['invitations', workspace.id], (prev = []) => prev.filter((i) => i.id !== id));
      toast.success('Invitation revoked');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to revoke invitation')),
  });

  const members = membersQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspace members, role management, and pending invitations.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite member
          </Button>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {membersQuery.isLoading ? (
            <ListSkeleton rows={4} />
          ) : membersQuery.isError ? (
            <p className="p-4 text-sm text-destructive">Failed to load members.</p>
          ) : members.length === 0 ? (
            <EmptyState title="No members yet" className="m-4" />
          ) : (
            <ul className="divide-y">
              {members.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isOnline={online.has(m.user.id)}
                  isAdmin={isAdmin}
                  onRoleChange={(role) => roleMutation.mutate({ userId: m.user.id, role })}
                  onRemove={() => {
                    if (confirm(`Remove ${m.user.name} from the workspace?`)) {
                      removeMutation.mutate(m.user.id);
                    }
                  }}
                  pending={
                    (roleMutation.isPending && roleMutation.variables?.userId === m.user.id) ||
                    (removeMutation.isPending && removeMutation.variables === m.user.id)
                  }
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations ({invitations.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {invitationsQuery.isLoading ? (
              <ListSkeleton rows={2} />
            ) : invitationsQuery.isError ? (
              <p className="p-4 text-sm text-destructive">Failed to load invitations.</p>
            ) : invitations.length === 0 ? (
              <EmptyState title="No pending invitations" className="m-4" />
            ) : (
              <ul className="divide-y">
                {invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.role.toLowerCase()} · {formatExpiry(inv.expiresAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Revoke invitation to ${inv.email}?`)) revokeMutation.mutate(inv.id);
                      }}
                      loading={revokeMutation.isPending && revokeMutation.variables === inv.id}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <InviteDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          workspaceId={workspace.id}
          onInvited={(invitation) => {
            qc.setQueryData(['invitations', workspace.id], (prev = []) => [invitation, ...prev]);
            setInviteOpen(false);
            setRevealedToken({ token: invitation.token, email: invitation.email });
          }}
        />
      )}

      <TokenRevealDialog
        invite={revealedToken}
        onClose={() => setRevealedToken(null)}
      />
    </div>
  );
}

function MemberRow({ member, isOnline, isAdmin, onRoleChange, onRemove, pending }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="relative">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium uppercase">
          {member.user.name?.[0] ?? '?'}
        </div>
        <span
          aria-label={isOnline ? 'online' : 'offline'}
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card',
            isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40',
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.user.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {member.user.email} · joined {formatJoined(member.joinedAt)}
        </p>
      </div>

      <Badge tone={member.role === 'ADMIN' ? 'primary' : 'neutral'}>
        {member.role.toLowerCase()}
      </Badge>

      {isAdmin && (
        <div className="flex items-center gap-2">
          <Select
            value={member.role}
            disabled={pending}
            onChange={(e) => {
              if (e.target.value !== member.role) onRoleChange(e.target.value);
            }}
            aria-label={`Change role for ${member.user.name}`}
            className="h-8 w-28 text-xs"
          >
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Member</option>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            loading={pending && member.role !== 'ADMIN'}
            aria-label={`Remove ${member.user.name}`}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </li>
  );
}

function InviteDialog({ open, onClose, workspaceId, onInvited }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: { email: '', role: 'MEMBER' },
  });

  async function onSubmit(values) {
    try {
      const res = await api.post(`/workspaces/${workspaceId}/invitations`, values);
      reset();
      onInvited(res.data.invitation);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to send invitation'));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Invite member"
      description="An invitation token will be generated. Share it with the recipient — they accept it via /accept-invite."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label htmlFor="invite-email" className="text-xs font-medium">
            Email
          </label>
          <Input
            id="invite-email"
            type="email"
            placeholder="teammate@company.com"
            autoFocus
            {...register('email')}
            className="mt-1"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="invite-role" className="text-xs font-medium">
            Role
          </label>
          <Select id="invite-role" {...register('role')} className="mt-1">
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </div>

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
            Send invitation
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function TokenRevealDialog({ invite, onClose }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Clipboard unavailable — copy the token manually');
    }
  }

  return (
    <Dialog
      open={!!invite}
      onClose={() => {
        setCopied(false);
        onClose();
      }}
      title="Invitation created"
      description={
        invite
          ? `Share this token with ${invite.email}. It is shown ONCE — store it somewhere safe.`
          : ''
      }
      widthClassName="max-w-lg"
    >
      {invite && (
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-3">
            <code className="block break-all font-mono text-xs">{invite.token}</code>
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy to clipboard'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function ListSkeleton({ rows = 3 }) {
  return (
    <ul className="divide-y">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-48 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
        </li>
      ))}
    </ul>
  );
}
