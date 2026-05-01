import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Server-side auth gate for the (app) route group. Forwards the `at` cookie
 * to the API's /auth/me; on 401 (or any failure) bounces to /login server-side
 * — no flash of protected UI. The proxy at src/proxy.js does an earlier redirect
 * for requests with no `at` cookie at all, so this fetch only runs when a token
 * is present and we want to verify it's still valid.
 */
async function loadCurrentUser() {
  const at = (await cookies()).get('at')?.value;
  if (!at) return null;
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Cookie: `at=${at}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.user ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export default async function AppLayout({ children }) {
  const user = await loadCurrentUser();
  if (!user) redirect('/login');
  return <>{children}</>;
}
