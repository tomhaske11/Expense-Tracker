'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/integrations/supabase/browser';
import AuthCard, { INPUT, LABEL, PRIMARY, safeNext } from '@/app/_components/AuthCard';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const notice =
    params.get('error') === 'link'
      ? 'That link has expired or was already used. Sign in, or request a new one.'
      : params.get('deleted')
        ? 'Your account and all its data were deleted.'
        : null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    const { error: e } = await getSupabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
    if (e) {
      setError(e.message === 'Email not confirmed' ? 'Confirm your email first: check your inbox for the link.' : 'Wrong email or password.');
      setLoading(false);
      return;
    }
    router.replace(safeNext(params.get('next')));
    router.refresh();
  };

  return (
    <AuthCard
      title="Sign in"
      footer={
        <>
          New to expenseAI?{' '}
          <Link href="/signup" className="text-accent hover:text-accent-strong">
            Create an account
          </Link>
        </>
      }
    >
      {notice && <p className="mb-4 text-sm text-amber-300">{notice}</p>}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="email" className={LABEL}>Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
        </div>
        <div>
          <div className="flex justify-between">
            <label htmlFor="password" className={LABEL}>Password</label>
            <Link href="/forgot-password" className="text-xs text-accent hover:text-accent-strong">Forgot password?</Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className={PRIMARY}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
