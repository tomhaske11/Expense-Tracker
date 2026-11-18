'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { QUICK_ADD_MAX_LENGTH } from '@/features/expenses/constants';
import type { ParsedExpense } from '@/features/expenses/lib/quickAdd';

interface QuickAddInputProps {
  /** Called with the parsed fields; the parent pre-fills the form for the user to review. */
  onParsed: (expense: ParsedExpense) => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; note: string | null }
  | { kind: 'error'; message: string };

export default function QuickAddInput({ onParsed }: QuickAddInputProps) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const run = async () => {
    const trimmed = text.trim();
    if (!trimmed || status.kind === 'loading') return;

    setStatus({ kind: 'loading' });
    try {
      const res = await fetch('/api/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, today: format(new Date(), 'yyyy-MM-dd') }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : 'Quick add failed. Please try again.';
        setStatus({ kind: 'error', message });
        return;
      }
      const parsed = data as ParsedExpense;
      onParsed(parsed);
      setStatus({ kind: 'done', note: parsed.note });
    } catch {
      setStatus({ kind: 'error', message: "Couldn't reach the server. Is it running?" });
    }
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <label htmlFor="quick-add" className="block text-sm font-medium text-gray-900 mb-1">
        ✨ Quick add
      </label>
      <p className="text-xs text-gray-600 mb-2">
        Describe the expense in your own words and we&apos;ll fill in the form for you to check.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id="quick-add"
          type="text"
          value={text}
          maxLength={QUICK_ADD_MAX_LENGTH}
          placeholder='e.g. "lunch at Chipotle 14.50 yesterday"'
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter fills the form instead of submitting it.
            if (e.key === 'Enter') {
              e.preventDefault();
              void run();
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => void run()}
          disabled={!text.trim() || status.kind === 'loading'}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {status.kind === 'loading' ? 'Reading…' : 'Fill in'}
        </button>
      </div>
      <div aria-live="polite" className="mt-2 text-sm min-h-5">
        {status.kind === 'done' && (
          <p className="text-gray-700">
            Filled in below. Check it, then save.
            {status.note && <span className="block text-amber-700">⚠️ {status.note}</span>}
          </p>
        )}
        {status.kind === 'error' && <p className="text-red-600">{status.message}</p>}
      </div>
      <p className="text-xs text-gray-500">What you type here is sent to Anthropic&apos;s Claude API to read it.</p>
    </div>
  );
}
