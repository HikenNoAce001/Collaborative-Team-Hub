'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Moon,
  Plus,
  ScrollText,
  Sun,
  Users,
} from 'lucide-react';

import api from '@/lib/api';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

const GROUP_CLS =
  'px-2 pb-1 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pb-1';

const ICONS = {
  announcements: Megaphone,
  goals: ClipboardList,
  'action-items': CheckSquare,
  analytics: LayoutDashboard,
  members: Users,
  audit: ScrollText,
};

/**
 * Global ⌘K palette. Mounted once at the (app) layout level so it's available
 * everywhere a logged-in user is. Actions are inferred from the current route +
 * the set of workspaces the user belongs to. Fuzzy search via cmdk's built-in.
 */
export default function CommandPalette() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.get('/workspaces').then((r) => r.data.workspaces),
    staleTime: 60_000,
    enabled: open,
  });

  // ⌘K / Ctrl+K toggles the palette. Esc is handled by cmdk's Dialog.
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function run(fn) {
    setOpen(false);
    // Run after the dialog finishes closing so the focus restore happens cleanly.
    setTimeout(fn, 0);
  }

  const goWorkspaceRoute = (slug) => {
    if (!currentWorkspaceId) {
      router.push('/workspaces');
      return;
    }
    router.push(`/w/${currentWorkspaceId}/${slug}`);
  };

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } finally {
      router.push('/login');
    }
  }

  const workspaces = workspacesQuery.data ?? [];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      overlayClassName="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[15vh] z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-elevated focus:outline-none"
    >
      <Command.Input
        placeholder="Type a command or search…"
        className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
      />

      <Command.List className="max-h-80 overflow-y-auto p-1">
        <Command.Empty className="px-3 py-6 text-center text-xs text-muted-foreground">
          No results.
        </Command.Empty>

        {currentWorkspaceId && (
          <Command.Group
            heading="Navigate"
            className={GROUP_CLS}
          >
            {[
              { slug: 'announcements', label: 'Go to Announcements' },
              { slug: 'goals', label: 'Go to Goals' },
              { slug: 'action-items', label: 'Go to Action Items' },
              { slug: 'analytics', label: 'Go to Analytics' },
              { slug: 'members', label: 'Go to Members' },
              { slug: 'audit', label: 'Go to Audit Log' },
            ].map(({ slug, label }) => {
              const Icon = ICONS[slug];
              return (
                <Item key={slug} onSelect={() => run(() => goWorkspaceRoute(slug))}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Item>
              );
            })}
          </Command.Group>
        )}

        {currentWorkspaceId && (
          <Command.Group
            heading="Create"
            className={GROUP_CLS}
          >
            <Item onSelect={() => run(() => goWorkspaceRoute('goals'))}>
              <Plus className="h-3.5 w-3.5" />
              Create goal
            </Item>
            <Item onSelect={() => run(() => goWorkspaceRoute('action-items'))}>
              <Plus className="h-3.5 w-3.5" />
              Create action item
            </Item>
            <Item onSelect={() => run(() => goWorkspaceRoute('announcements'))}>
              <Plus className="h-3.5 w-3.5" />
              Post announcement
            </Item>
          </Command.Group>
        )}

        {workspaces.length > 1 && (
          <Command.Group
            heading="Switch workspace"
            className={GROUP_CLS}
          >
            {workspaces.map((w) => (
              <Item
                key={w.id}
                onSelect={() => run(() => router.push(`/w/${w.id}`))}
                value={`switch ${w.name}`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: w.accentColor }}
                />
                <span className="truncate">{w.name}</span>
                {w.id === currentWorkspaceId && (
                  <span className="ml-auto text-[10px] text-muted-foreground">current</span>
                )}
              </Item>
            ))}
          </Command.Group>
        )}

        <Command.Group
          heading="Preferences"
          className={GROUP_CLS}
        >
          <Item
            onSelect={() => run(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
            value="toggle theme dark light"
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            Toggle theme ({theme === 'dark' ? 'light' : 'dark'})
          </Item>
          <Item onSelect={() => run(handleLogout)} value="logout sign out">
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </Item>
        </Command.Group>
      </Command.List>

      <div className="border-t bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
        <span className="rounded border bg-card px-1.5 py-0.5 font-mono">⌘K</span> to toggle ·
        <span className="mx-1 rounded border bg-card px-1.5 py-0.5 font-mono">↵</span> to run ·
        <span className="rounded border bg-card px-1.5 py-0.5 font-mono">esc</span> to close
      </div>
    </Command.Dialog>
  );
}

function Item({ children, onSelect, value }) {
  return (
    <Command.Item
      onSelect={onSelect}
      value={value}
      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
    >
      {children}
    </Command.Item>
  );
}
