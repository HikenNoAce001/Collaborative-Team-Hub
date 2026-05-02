'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckSquare,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  ScrollText,
  Users,
} from 'lucide-react';

import api from '@/lib/api';
import { cn } from '@/lib/cn';
import { useSocket } from '@/lib/socket';
import ThemeToggle from '@/components/ThemeToggle';
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
    try {
      await api.post('/auth/logout');
    } finally {
      router.push('/login');
    }
  }

  const items = workspace.myRole === 'ADMIN' ? [...NAV, ...ADMIN_NAV] : NAV;

  const ctxValue = useMemo(
    () => ({
      workspace,
      online,
      isAdmin: workspace.myRole === 'ADMIN',
    }),
    [workspace, online],
  );

  return (
    <WorkspaceProvider value={ctxValue}>
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col">
          <div className="flex h-14 items-center gap-2 border-b px-4">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: workspace.accentColor }}
            />
            <Link href={`/w/${workspace.id}`} className="truncate text-sm font-semibold">
              {workspace.name}
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-2 py-3">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(`/w/${workspace.id}/${href}`);
              return (
                <Link
                  key={href}
                  href={`/w/${workspace.id}/${href}`}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t p-3">
            <p className="px-1 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              Members ({members.length})
            </p>
            <ul className="space-y-1">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-2 px-1 text-xs">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      online.has(m.user.id) ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                    )}
                    aria-label={online.has(m.user.id) ? 'online' : 'offline'}
                  />
                  <span className="truncate">{m.user.name}</span>
                  {m.role === 'ADMIN' && (
                    <span className="ml-auto text-[10px] text-muted-foreground">admin</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between gap-3 border-b px-4 md:px-6">
            <Link
              href="/workspaces"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← All workspaces
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Notifications"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Bell className="h-4 w-4" />
              </button>
              <ThemeToggle />
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
