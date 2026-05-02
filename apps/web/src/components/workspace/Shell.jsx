'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare,
  ChevronLeft,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Search,
  ScrollText,
  Users,
} from 'lucide-react';

import api from '@/lib/api';
import { cn } from '@/lib/cn';
import { useSocket } from '@/lib/socket';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationBell from '@/components/workspace/NotificationBell';
import CommandPalette from '@/components/CommandPalette';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceContext';

const NAV = [
  { href: 'announcements', label: 'Announcements', icon: Megaphone },
  { href: 'goals', label: 'Goals', icon: ClipboardList },
  { href: 'action-items', label: 'Action Items', icon: CheckSquare },
  { href: 'analytics', label: 'Analytics', icon: LayoutDashboard },
  { href: 'members', label: 'Members', icon: Users },
];

const ADMIN_NAV = [{ href: 'audit', label: 'Audit Log', icon: ScrollText }];

/**
 * @param {{
 *   workspace: { id: string, name: string, accentColor: string, myRole: 'ADMIN'|'MEMBER', description?: string|null },
 *   members: Array<{ id: string, role: string, user: { id: string, name: string, avatarUrl: string|null } }>,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function Shell({ workspace, members, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { socket } = useSocket(workspace.id);
  const [online, setOnline] = useState(/** @type {Set<string>} */ (new Set()));
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.user),
    staleTime: Infinity,
  });

  useEffect(() => {
    setCurrentWorkspace(workspace.id);
  }, [workspace.id, setCurrentWorkspace]);

  useEffect(() => {
    if (!socket) return undefined;
    const onPresence = (payload) => {
      if (payload.workspaceId !== workspace.id) return;
      setOnline(new Set(payload.online ?? []));
    };
    socket.on('presence:update', onPresence);
    return () => socket.off('presence:update', onPresence);
  }, [socket, workspace.id]);

  async function handleLogout() {
    try { await api.post('/auth/logout'); } finally { router.push('/login'); }
  }

  function openPalette() {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  }

  const items = workspace.myRole === 'ADMIN' ? [...NAV, ...ADMIN_NAV] : NAV;

  const pageTitle = useMemo(() => {
    const match = [...NAV, ...ADMIN_NAV].find((item) =>
      pathname.includes(`/${item.href}`)
    );
    return match?.label ?? workspace.name;
  }, [pathname, workspace.name]);

  const ctxValue = useMemo(
    () => ({ workspace, online, isAdmin: workspace.myRole === 'ADMIN' }),
    [workspace, online],
  );

  const initial = (name) => (name ?? '?')[0].toUpperCase();

  return (
    <WorkspaceProvider value={ctxValue}>
      <div className="flex min-h-screen bg-background">

        {/* ── Sidebar ───────────────────────────────────────────────── */}
        <aside className="hidden w-56 shrink-0 flex-col border-r bg-card md:flex">

          {/* Back to workspaces */}
          <Link
            href="/workspaces"
            className="flex items-center gap-1.5 px-4 pt-3 pb-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-3 w-3" />
            All workspaces
          </Link>

          {/* Workspace identity */}
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: workspace.accentColor }}
            >
              {initial(workspace.name)}
            </span>
            <span className="truncate text-sm font-semibold">{workspace.name}</span>
          </div>

          {/* ⌘K search trigger */}
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={openPalette}
              className="flex w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Search className="h-3 w-3 shrink-0" />
              <span className="flex-1 text-left">Search…</span>
              <kbd className="rounded border border-input bg-muted px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5 px-2">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname.includes(`/w/${workspace.id}/${href}`);
              return (
                <Link
                  key={href}
                  href={`/w/${workspace.id}/${href}`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : '')} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Members / presence */}
          <div className="border-t px-3 py-3">
            <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Members
            </p>
            <ul className="space-y-1">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-2 px-1">
                  <span className="relative shrink-0">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                      {initial(m.user.name)}
                    </span>
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card',
                        online.has(m.user.id) ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                      )}
                    />
                  </span>
                  <span className="truncate text-xs">{m.user.name}</span>
                  {m.role === 'ADMIN' && (
                    <span className="ml-auto shrink-0 text-[9px] text-muted-foreground">
                      admin
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* User footer */}
          <div className="flex items-center gap-2 border-t px-3 py-2.5">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundImage: 'var(--gradient-primary)' }}
            >
              {initial(me?.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{me?.name ?? '…'}</p>
              <p className="text-[10px] capitalize text-muted-foreground">
                {workspace.myRole.toLowerCase()}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </aside>

        {/* ── Main area ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Top header */}
          <header className="flex h-12 items-center justify-between gap-3 border-b bg-card/60 px-5 backdrop-blur-sm">
            <h1 className="text-sm font-semibold">{pageTitle}</h1>
            <div className="flex items-center gap-1.5">
              {/* ⌘K pill — visible at all sizes */}
              <button
                type="button"
                onClick={openPalette}
                className="hidden items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
              >
                <Search className="h-3 w-3" />
                <kbd className="font-mono">⌘K</kbd>
              </button>
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 px-5 py-6 md:px-8">{children}</main>
        </div>
      </div>

      <CommandPalette />
    </WorkspaceProvider>
  );
}
