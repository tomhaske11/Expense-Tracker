'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { NewsIcon, SparkleIcon } from '@/lib/icons';
import { useNews, useNewsNotes } from '@/features/investing/hooks/useMarketData';
import { SandboxBadge } from '@/features/investing/components/Change';

/**
 * Headlines with Claude's one-line "why it matters". Two feeds: the market as a whole, and
 * news about what you own or watch (up to 5 tickers, biggest holdings first).
 */
export default function NewsFeed({ tickers, limit }: { tickers: string[]; limit?: number }) {
  const [choice, setFeed] = useState<'mine' | 'market' | null>(null);
  // Default to your stocks once you have any, until you pick a feed.
  const feed = choice ?? (tickers.length ? 'mine' : 'market');
  const active = feed === 'mine' && tickers.length ? tickers.slice(0, 5) : [];
  const news = useNews(active);
  const notes = useNewsNotes(active, news.data !== null && news.data.articles.length > 0);
  const byId = new Map((notes.data?.notes ?? []).map((n) => [n.id, n.why]));
  const articles = (news.data?.articles ?? []).slice(0, limit);

  return (
    <section className="bg-panel border border-line rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
          <NewsIcon className="w-5 h-5 text-accent" />
          News
          {news.data?.sandbox && <SandboxBadge />}
        </h2>
        {tickers.length > 0 && (
          <div role="tablist" aria-label="News feed" className="inline-flex rounded-full border border-line p-0.5 self-start">
            {(['mine', 'market'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={feed === f}
                onClick={() => setFeed(f)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${feed === f ? 'bg-accent text-accent-ink' : 'text-ink-muted hover:text-ink'}`}
              >
                {f === 'mine' ? 'Your stocks' : 'Market'}
              </button>
            ))}
          </div>
        )}
      </div>

      {news.loading ? (
        <p className="text-sm text-ink-muted">Loading headlines…</p>
      ) : news.error ? (
        <p className="text-sm text-red-400">{news.error}</p>
      ) : articles.length === 0 ? (
        <p className="text-sm text-ink-muted">No recent headlines.</p>
      ) : (
        <ul className="divide-y divide-line">
          {articles.map((a) => {
            const why = byId.get(a.id);
            return (
              <li key={a.id} className="py-3">
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-ink font-medium hover:text-accent">
                    {a.title}
                  </a>
                ) : (
                  <p className="text-ink font-medium">{a.title}</p>
                )}
                <p className="text-xs text-ink-muted mt-0.5">
                  {a.publisher} · {formatDistanceToNow(new Date(a.publishedAt), { addSuffix: true })}
                  {a.tickers.length > 0 && ` · ${a.tickers.slice(0, 4).join(', ')}`}
                </p>
                {why ? (
                  <p data-why className="mt-1.5 text-sm text-ink-soft flex gap-1.5">
                    <SparkleIcon className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span>{why}</span>
                  </p>
                ) : (
                  notes.loading && <p className="mt-1.5 text-xs text-ink-faint">Claude is reading this…</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-ink-faint">
        Notes marked with a sparkle are written by Claude from the headline and summary (sent to Anthropic&apos;s Claude API) and can be wrong. Information only, not investment advice.
      </p>
    </section>
  );
}
