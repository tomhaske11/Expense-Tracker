import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/env';

/*
 * Server-side Supabase access.
 *  - getUserFromRequest(): the verified signed-in user for an API request, from the session
 *    cookie (web) or an `Authorization: Bearer <access token>` header (native app).
 *  - getSupabaseAdmin(): the secret-key client. It bypasses row-level security, so only use it
 *    for server-only data (bank connections) or admin actions (account deletion), always
 *    scoped to the verified user id.
 */

export interface AuthUser {
  id: string;
  email: string | null;
}

/** A per-request client acting as the user in the request's session cookie. */
export async function getSupabaseForRequest() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    db: { schema: 'public' },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a context that can't set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** The verified user making this request, or null. Verifies the JWT (signature and expiry). */
export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabase = bearer
    ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    : await getSupabaseForRequest();
  const { data, error } = await supabase.auth.getClaims(bearer);
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: typeof data.claims.email === 'string' ? data.claims.email : null };
}

function createAdmin() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('SUPABASE_SECRET_KEY is not set.');
  return createClient(SUPABASE_URL, secret, { db: { schema: 'public' }, auth: { persistSession: false, autoRefreshToken: false } });
}

let admin: ReturnType<typeof createAdmin> | null = null;

export function getSupabaseAdmin() {
  admin ??= createAdmin();
  return admin;
}

/** The verified user, or a 401 Response to return as-is. */
export async function requireUser(request: Request): Promise<AuthUser | Response> {
  const user = await getUserFromRequest(request);
  return user ?? Response.json({ error: 'Please sign in again.' }, { status: 401 });
}
