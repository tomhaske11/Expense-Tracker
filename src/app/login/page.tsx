'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/app/_components/Brand';

/** Where to go after signing in: the ?next= path, if it's a same-site path. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace(nextPath());
        return;
      }
      const data: { error?: string } | null = await res.json().catch(() => null);
      setError(data?.error ?? 'Sign-in failed. Please try again.');
    } catch {
      setError("Couldn't reach the server. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <form onSubmit={submit} className="bg-panel rounded-lg p-8 w-full max-w-sm border border-line">
        <div className="mb-8">
          <Brand href={null} />
          <p className="mt-2 text-sm text-ink-muted">Sign in to continue.</p>
        </div>
        <label htmlFor="password" className="block text-sm font-medium text-ink-soft mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-accent mb-4"
        />
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <button
          type="submit"
          disabled={!password || loading}
          className="w-full px-4 py-2 bg-accent text-accent-ink rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
