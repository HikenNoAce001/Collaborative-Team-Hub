import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import Shell from '@/components/workspace/Shell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function apiGet(path, cookieHeader) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  });
  if (res.status === 401) return { unauthorized: true };
  if (res.status === 403 || res.status === 404) return { forbidden: true };
  if (!res.ok) return { error: true };
  return { data: await res.json() };
}

/**
 * Server-side workspace shell. Forwards the auth cookie to load the workspace
 * detail + member list once, then passes them as props to the client `Shell`
 * which owns realtime presence + theme + nav. Failures bounce out: 401 → /login
 * (cookie expired between proxy + here), 403/404 → /workspaces (no access).
 *
 * @param {{ children: import('react').ReactNode, params: Promise<{ id: string }> }} props
 */
export default async function WorkspaceLayout({ children, params }) {
  const { id } = await params;
  const at = (await cookies()).get('at')?.value;
  if (!at) redirect('/login');

  const cookieHeader = `at=${at}`;
  const [wsResult, membersResult] = await Promise.all([
    apiGet(`/workspaces/${id}`, cookieHeader),
    apiGet(`/workspaces/${id}/members`, cookieHeader),
  ]);

  if (wsResult.unauthorized || membersResult.unauthorized) redirect('/login');
  if (wsResult.forbidden || wsResult.error) redirect('/workspaces');
  if (membersResult.forbidden || membersResult.error) notFound();

  return (
    <Shell
      workspace={wsResult.data.workspace}
      members={membersResult.data.members ?? []}
    >
      {children}
    </Shell>
  );
}
