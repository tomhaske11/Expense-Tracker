import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, isAuthEnabled, isValidSession } from '@/lib/session';

/*
 * Password gate (only when APP_PASSWORD is set). Pages redirect to /login; API routes get 401.
 * Rate limiting lives in the API routes themselves, not here.
 */

const PUBLIC_PATHS = new Set(['/login', '/api/login', '/api/logout']);

export async function proxy(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return Response.json({ error: 'Please sign in again.' }, { status: 401 });
  }
  const login = new URL('/login', request.url);
  login.searchParams.set('next', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next.js assets and static files (anything with a file extension).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
