'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { BankIcon, CheckCircleIcon, UploadIcon } from '@/lib/icons';
import { useImportReview } from '@/features/imports/hooks/useImportReview';
import { useBankConnections } from '@/features/imports/hooks/useBankConnections';
import ImportReview from '@/features/imports/components/ImportReview';
import { lastSynced } from '@/features/imports/lib/lastSynced';

/** A connection is due for its routine sync after this long. */
const SYNC_EVERY_MS = 6 * 60 * 60 * 1000;
const OUTLINE =
  'px-3 py-1.5 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors text-sm whitespace-nowrap disabled:opacity-50';

/** Sync connected banks, upload a statement, and review before saving. Banks are linked in Account. */
export default function ImportCenter() {
  const bank = useBankConnections();
  const { session, fromFile, fromBank, update, confirm, cancel } = useImportReview(bank.replace);
  const fileRef = useRef<HTMLInputElement>(null);
  const autoSynced = useRef(false);
  const busy = session.phase === 'loading' || session.phase === 'review';

  // Routine sync: when the screen opens, sync the first connection that's due. Runs once,
  // after connections load (the sync itself sets state asynchronously).
  const { connections } = bank;
  useEffect(() => {
    if (!connections || autoSynced.current) return;
    const due = connections.find((c) => !c.lastSyncedAt || Date.now() - new Date(c.lastSyncedAt).getTime() > SYNC_EVERY_MS);
    if (!due) return;
    const timer = setTimeout(() => {
      autoSynced.current = true;
      void fromBank(due);
    }, 0);
    return () => clearTimeout(timer);
  }, [connections, fromBank]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-panel border border-line rounded-lg p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <BankIcon className="w-5 h-5 text-accent" />
                Bank accounts
              </h2>
              <p className="text-sm text-ink-muted">New transactions sync each time you open this page.</p>
            </div>
            <Link href="/account#banks" className="shrink-0 text-sm text-accent hover:text-accent-strong whitespace-nowrap">
              Manage banks
            </Link>
          </div>
          {bank.connections === null ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : bank.connections.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No banks connected yet.{' '}
              <Link href="/account#banks" className="text-accent hover:text-accent-strong">
                Connect one in Account
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {bank.connections.map((c) => (
                <li key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-ink font-medium">
                      {c.institution.name}
                      {c.provider === 'mock' && <span className="ml-2 text-xs text-amber-300 font-normal">sandbox</span>}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {c.accounts.map((a) => `${a.name}${a.mask ? ` ••${a.mask}` : ''}`).join(' · ')} · {lastSynced(c)}
                    </p>
                  </div>
                  <button type="button" onClick={() => void fromBank(c)} disabled={busy} className={`${OUTLINE} self-start sm:self-auto`}>
                    Sync now
                  </button>
                </li>
              ))}
            </ul>
          )}
          {bank.error && <p className="mt-2 text-sm text-red-400">{bank.error}</p>}
        </section>

        <section className="bg-panel border border-line rounded-lg p-6">
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2 mb-1">
            <UploadIcon className="w-5 h-5 text-accent" />
            Upload a statement
          </h2>
          <p className="text-sm text-ink-muted mb-4">CSV, OFX/QFX or PDF from your bank or card. Duplicates are skipped automatically.</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full py-6 rounded-lg border border-dashed border-line hover:border-accent text-ink-soft hover:text-accent transition-colors disabled:opacity-50"
          >
            Choose a statement file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt,.ofx,.qfx,.pdf,text/csv,application/pdf"
            className="hidden"
            aria-label="Statement file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void fromFile(file);
            }}
          />
          <p className="mt-3 text-xs text-ink-muted">
            CSV and OFX files are read in your browser. Unfamiliar merchant descriptions (and, for an unrecognized CSV
            layout, its first rows) are sent to Anthropic&apos;s Claude API to categorize them; PDFs are read by Claude.
          </p>
        </section>
      </div>

      <div aria-live="polite">
        {session.phase === 'loading' && (
          <p className="text-sm text-ink-soft flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            {session.loadingLabel}
          </p>
        )}
        {session.phase === 'error' && <p className="text-sm text-red-400">{session.message}</p>}
        {session.phase === 'done' && (
          <p className="text-sm text-accent flex items-start gap-2">
            <CheckCircleIcon className="w-4 h-4 mt-0.5 shrink-0" />
            {session.message}
          </p>
        )}
      </div>

      {session.phase === 'review' && (
        <ImportReview session={session} onUpdate={update} onConfirm={() => void confirm()} onCancel={cancel} />
      )}

    </div>
  );
}
