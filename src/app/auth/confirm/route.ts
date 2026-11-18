import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { getSupabaseForRequest } from '@/integrations/supabase/server';

/**
 * Landing point for email links (sign-up confirmation, password reset). Exchanges the link's
 * code (or token hash) for a session cookie, then continues to ?next= (same-site only).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextParam = url.searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;

  const supabase = await getSupabaseForRequest();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error('Missing code') };

  if (error) {
    const login = new URL('/login', url.origin);
    login.searchParams.set('error', 'link');
    return NextResponse.redirect(login);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
