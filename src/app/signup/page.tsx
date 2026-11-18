'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/integrations/supabase/browser';
import AuthCard, { INPUT, LABEL, PRIMARY } from '@/app/_components/AuthCard';

const MIN_PASSWORD = 8;

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: e } = await getSupabaseBrowser().auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/` },
    });
    setLoading(false);
    if (e) {
      setError(e.message);
      return;
    }
    if (data.session) {
      // Email confirmation is off for this project: signed in already.
      router.replace('/');
      router.refresh();
      return;
    }
    setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <AuthCard title="Check your email" subtitle={`We sent a confirmation link to ${sentTo}. Open it on this device to finish creating your account.`}>
        <Link href="/login" className="text-sm text-accent hover:text-accent-strong">Back to sign in</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Your expenses are saved to your account and sync across your devices."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:text-accent-strong">Sign in</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="email" className={LABEL}>Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label htmlFor="password" className={LABEL}>Password</label>
          <input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
          <p className="mt-1 text-xs text-ink-faint">At least {MIN_PASSWORD} characters.</p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className={PRIMARY}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthCard>
  );
}
