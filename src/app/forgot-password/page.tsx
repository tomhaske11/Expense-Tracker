'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/integrations/supabase/browser';
import AuthCard, { INPUT, LABEL, PRIMARY } from '@/app/_components/AuthCard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: e } = await getSupabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/account/password`,
    });
    setLoading(false);
    if (e) setError(e.message);
    else setSent(true);
  };

  return (
    <AuthCard
      title="Reset your password"
      subtitle={sent ? `If an account exists for ${email.trim()}, we've sent a reset link. Open it on this device.` : "We'll email you a link to set a new password."}
      footer={<Link href="/login" className="text-accent hover:text-accent-strong">Back to sign in</Link>}
    >
      {!sent && (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className={LABEL}>Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className={PRIMARY}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
