'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { BankIcon, CheckCircleIcon, CloseIcon, UploadIcon } from '@/lib/icons';
import { useImportReview } from '@/features/imports/hooks/useImportReview';
import { useBankConnections } from '@/features/imports/hooks/useBankConnections';
import ImportReview from '@/features/imports/components/ImportReview';
import type { BankConnectionView, BankInstitution } from '@/features/imports/lib/protocol';

/** A connection is due for its routine sync after this long. */
const SYNC_EVERY_MS = 6 * 60 * 60 * 1000;
const OUTLINE =
  'px-3 py-1.5 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors text-sm whitespace-nowrap disabled:opacity-50';

function ConnectDialog({
  institutions,
  sandbox,
  onPick,
  onClose,
}: {
  institutions: BankInstitution[];
  sandbox: boolean;
  onPick: (institution: BankInstitution) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal aria-label="Connect a bank" className="relative w-full max-w-md bg-panel border border-line rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Connect a bank</h2>
            {sandbox && (
              <p className="text-sm text-amber-300 mt-1">
                Sandbox mode: these are test banks with generated transactions. No real bank or money is involved.
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <ul className="space-y-2">
          {institutions.map((institution) => (
            <li key={institution.id}>
              <button
                type="button"
                onClick={() => onPick(institution)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-line bg-panel-raised hover:border-accent text-left transition-colors"
              >
                <BankIcon className="w-5 h-5 text-accent" />
                <span className="text-ink">{institution.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink-muted">
          Real banks will connect through a secure provider window. expenseAI never sees your bank password, and access
          tokens stay on the server.
        </p>
      </div>
    </div>
  );
}

function lastSynced(connection: BankConnectionView) {
  return connection.lastSyncedAt
    ? `Synced ${formatDistanceToNow(new Date(connection.lastSyncedAt), { addSuffix: true })}`
    : 'Not synced yet';
}

/** Bank connections, statement upload and the review step, on one screen. */
export default function ImportCenter() {
  const bank = useBankConnections();
  const { session, fromFile, fromBank, update, confirm, cancel } = useImportReview(bank.replace);
  const [dialog, setDialog] = useState<{ institutions: BankInstitution[]; sandbox: boolean } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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

  const openConnect = async () => {
    setNotice(null);
    try {
      setDialog(await bank.startLink());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't start connecting a bank.");
    }
  };

  const pick = async (institution: BankInstitution) => {
    setDialog(null);
    try {
      // The sandbox provider's widget returns this public token; a real provider's widget supplies its own.
      const connection = await bank.finishLink(`public-mock-${institution.id}`);
      autoSynced.current = true;
      void fromBank(connection);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't connect the bank.");
    }
  };

  const disconnect = async (connection: BankConnectionView) => {
    try {
      await bank.disconnect(connection.id);
      setNotice(`Disconnected ${connection.institution.name}. Expenses you already imported stay.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't disconnect.");
    }
  };

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
            <button
              type="button"
              onClick={() => void openConnect()}
              disabled={busy}
              className="shrink-0 px-4 py-2 bg-accent text-accent-ink rounded-full hover:bg-accent-strong disabled:opacity-50 transition-colors text-sm font-medium"
            >
              Connect a bank
            </button>
          </div>
          {bank.connections === null ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : bank.connections.length === 0 ? (
            <p className="text-sm text-ink-muted">No banks connected yet.</p>
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
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void fromBank(c)} disabled={busy} className={OUTLINE}>
                      Sync now
                    </button>
                    <button type="button" onClick={() => void disconnect(c)} disabled={busy} className={OUTLINE}>
                      Disconnect
                    </button>
                  </div>
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
        {notice && <p className="text-sm text-ink-soft">{notice}</p>}
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

      {dialog && <ConnectDialog {...dialog} onPick={(i) => void pick(i)} onClose={() => setDialog(null)} />}
    </div>
  );
}
