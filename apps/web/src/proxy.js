import { NextResponse } from 'next/server';

// Next.js 16 file convention — the former `middleware.js` was renamed to `proxy.js`.
// Cheap cookie-presence check that bounces unauthenticated users to /login *before*
// the (app) route group's Server Component layout fetches /auth/me. The layout
// still does the actual token verification — this proxy only saves a round-trip
// when the cookie isn't even there.

const PUBLIC_PATHS = ['/login', '/register'];

/**
 * @param {import('next/server').NextRequest} request
 */
export function proxy(request) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (pathname === '/' || pathname.startsWith('/_next') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  if (!request.cookies.has('at')) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/login') loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  // Match every path except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
