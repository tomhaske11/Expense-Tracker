'use client';

import { useMemo, useState } from 'react';
import { Expense } from '@/features/expenses/types';
import { CoachInsights, buildCoachSummary } from '@/features/analytics/lib/coach';
import { BulbIcon, CheckCircleIcon, EyeIcon, Icon, SparkleIcon } from '@/lib/icons';

interface BudgetCoachProps {
  expenses: Expense[];
  dailyBudget: number;
}

type Result = { key: string; insights: CoachInsights };
type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string };

// Insights already fetched this visit, keyed by the summary they describe, so returning to
// the page doesn't call Claude again for the same data.
const cache = new Map<string, CoachInsights>();

const KIND_STYLES: Record<CoachInsights['insights'][number]['kind'], { Icon: Icon; className: string; iconClass: string }> = {
  positive: { Icon: CheckCircleIcon, className: 'border-accent/30 bg-accent/10', iconClass: 'text-accent' },
  watch: { Icon: EyeIcon, className: 'border-amber-500/30 bg-amber-500/10', iconClass: 'text-amber-300' },
  tip: { Icon: BulbIcon, className: 'border-line bg-panel-raised', iconClass: 'text-accent' },
};

/** "Coach me": Claude's plain-English read on the month, from an aggregate summary. */
export default function BudgetCoach({ expenses, dailyBudget }: BudgetCoachProps) {
  const summary = useMemo(() => buildCoachSummary(expenses, dailyBudget), [expenses, dailyBudget]);
  const key = summary ? JSON.stringify(summary) : '';
  const [result, setResult] = useState<Result | null>(() => {
    const cached = key ? cache.get(key) : undefined;
    return cached ? { key, insights: cached } : null;
  });
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const run = async () => {
    if (!summary || status.kind === 'loading') return;
    setStatus({ kind: 'loading' });
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: key,
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : 'The budget coach failed. Please try again.';
        setStatus({ kind: 'error', message });
        return;
      }
      const insights = data as CoachInsights;
      cache.set(key, insights);
      setResult({ key, insights });
      setStatus({ kind: 'idle' });
    } catch {
      setStatus({ kind: 'error', message: "Couldn't reach the server. Is it running?" });
    }
  };

  const loading = status.kind === 'loading';
  const stale = result !== null && result.key !== key;

  return (
    <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="flex items-center gap-2 text-lg font-semibold text-ink">
            <SparkleIcon className="w-5 h-5 text-accent" />
            Budget coach
          </p>
          <p className="text-sm text-ink-muted">Claude&apos;s read on your month so far.</p>
        </div>
        {summary && (
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="shrink-0 px-4 py-2 bg-accent text-accent-ink rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-sm font-medium"
          >
            {loading ? 'Thinking…' : result ? 'Refresh' : 'Coach me'}
          </button>
        )}
      </div>

      {!summary && <p className="text-sm text-ink-muted">Add an expense this month to get coaching.</p>}

      <div aria-live="polite">
        {status.kind === 'error' && <p className="text-sm text-red-400 mb-3">{status.message}</p>}

        {result && (
          <div className={stale ? 'opacity-60' : undefined}>
            {stale && (
              <p className="text-xs text-ink-muted mb-2">Your data or budget changed since this was written. Refresh for an update.</p>
            )}
            <p className="text-ink font-medium mb-3">{result.insights.headline}</p>
            <ul className="space-y-2 mb-3">
              {result.insights.insights.map((insight, i) => {
                const style = KIND_STYLES[insight.kind];
                return (
                  <li key={i} className={`rounded-lg border p-3 ${style.className}`}>
                    <p className="text-sm font-semibold text-ink">
                      <style.Icon className={`inline w-4 h-4 mr-1.5 -mt-0.5 ${style.iconClass}`} />
                      {insight.title}
                    </p>
                    <p className="text-sm text-ink-soft">{insight.detail}</p>
                  </li>
                );
              })}
            </ul>
            <p className="text-sm text-ink">
              <span className="font-semibold">Try this: </span>
              {result.insights.suggestion}
            </p>
          </div>
        )}
      </div>

      {summary && (
        <p className="mt-3 text-xs text-ink-muted">
          Sends a summary of this month (totals by category and vendor, no individual expenses) to Anthropic&apos;s Claude
          API.
        </p>
      )}
    </div>
  );
}
