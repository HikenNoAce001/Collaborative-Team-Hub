'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Plus } from 'lucide-react';

export default function WorkspacesPage() {
  const router = useRouter();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.user),
  });

  const {
    data: list = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.get('/workspaces').then((r) => r.data.workspaces),
  });

  async function handleLogout() {
    await api.post('/auth/logout');
    router.push('/login');
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workspaces</h1>
          {user && (
            <p className="text-sm text-muted-foreground">
              Welcome, {user.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/workspaces/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load workspaces.
        </div>
      )}

      {!isLoading && !error && list.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No workspaces yet.</p>
          <Link
            href="/workspaces/new"
            className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
          >
            Create your first workspace
          </Link>
        </div>
      )}

      {!isLoading && list.length > 0 && (
        <div className="space-y-2">
          {list.map(
            (/** @type {any} */ ws) => (
              <Link
                key={ws.id}
                href={`/w/${ws.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: ws.accentColor || '#6366f1' }}
                />
                <div className="flex-1">
                  <p className="font-medium">{ws.name}</p>
                  {ws.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {ws.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground capitalize">
                  {ws.myRole?.toLowerCase()}
                </span>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
