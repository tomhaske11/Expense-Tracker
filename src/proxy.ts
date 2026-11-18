import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/integrations/supabase/env';

/*
 * Accounts gate (Supabase Auth). On every request it refreshes the session cookie, then:
 *  - pages need a signed-in user, otherwise redirect to /login?next=…
 *  - /api/* needs a signed-in user, otherwise 401. Requests with `Authorization: Bearer …`
 *    (the native app) pass through; each route verifies that token itself.
 * Rate limiting lives in the API routes, not here.
 */

const PUBLIC_PAGES = new Set(['/login', '/signup', '/forgot-password', '/auth/confirm']);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');

  if (!isSupabaseConfigured()) {
    const message = 'Accounts are not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.';
    return isApi ? Response.json({ error: message }, { status: 500 }) : new Response(message, { status: 500 });
  }
  if (isApi && /^Bearer\s/i.test(request.headers.get('authorization') ?? '')) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Redirects must carry any refreshed session cookies too.
  const redirect = (url: URL) => {
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  // Verifies the JWT and refreshes an expiring session (writing new cookies via setAll).
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (PUBLIC_PAGES.has(pathname)) {
    if (signedIn && pathname !== '/auth/confirm') return redirect(new URL('/', request.url));
    return response;
  }
  if (signedIn) return response;

  if (isApi) return Response.json({ error: 'Please sign in again.' }, { status: 401 });
  const login = new URL('/login', request.url);
  login.searchParams.set('next', pathname + search);
  return redirect(login);
}

export const config = {
  // Everything except Next.js assets and static files (anything with a file extension).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
