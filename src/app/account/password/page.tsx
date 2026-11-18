'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/integrations/supabase/browser';
import AuthCard, { INPUT, LABEL, PRIMARY } from '@/app/_components/AuthCard';

/** Set a new password: reached from a password-reset email (which signs the user in). */
export default function NewPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error: e } = await getSupabaseBrowser().auth.updateUser({ password });
    setLoading(false);
    if (e) setError(e.message);
    else router.replace('/');
  };

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="password" className={LABEL}>New password</label>
          <input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className={PRIMARY}>
          {loading ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </AuthCard>
  );
}
