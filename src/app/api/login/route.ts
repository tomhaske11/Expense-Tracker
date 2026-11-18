import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, isAuthEnabled, isCorrectPassword, sessionToken } from '@/lib/session';

/** POST { password } → sets the session cookie when it matches APP_PASSWORD. */
export async function POST(request: Request) {
  const limited = rateLimit(request, [{ name: 'loginPerMinute' }]);
  if (limited) return limited;

  if (!isAuthEnabled()) {
    return Response.json({ error: 'Sign-in is not enabled on this server.' }, { status: 400 });
  }

  let password = '';
  try {
    const body: unknown = await request.json();
    if (body && typeof body === 'object' && 'password' in body && typeof body.password === 'string') {
      password = body.password;
    }
  } catch {
    return Response.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  if (!(await isCorrectPassword(password))) {
    return Response.json({ error: 'Wrong password.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
