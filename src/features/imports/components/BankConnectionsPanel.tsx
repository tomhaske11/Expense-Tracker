'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BankIcon } from '@/lib/icons';
import { useBankConnections } from '@/features/imports/hooks/useBankConnections';
import ConnectBankDialog from '@/features/imports/components/ConnectBankDialog';
import { lastSynced } from '@/features/imports/lib/lastSynced';
import type { BankConnectionView, BankInstitution } from '@/features/imports/lib/protocol';

const OUTLINE =
  'px-3 py-1.5 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors text-sm whitespace-nowrap disabled:opacity-50';

/**
 * Account → Connected banks: link, see and disconnect banks. Pulling in their transactions
 * happens on /import (ImportCenter), which syncs a new connection as soon as it opens.
 */
export default function BankConnectionsPanel({ onConnected }: { onConnected: (connection: BankConnectionView) => void }) {
  const bank = useBankConnections();
  const [dialog, setDialog] = useState<{ institutions: BankInstitution[]; sandbox: boolean } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

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
    setWorking(true);
    try {
      // The sandbox provider's widget returns this public token; a real provider's widget supplies its own.
      onConnected(await bank.finishLink(`public-mock-${institution.id}`));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't connect the bank.");
      setWorking(false);
    }
  };

  const disconnect = async (connection: BankConnectionView) => {
    setWorking(true);
    try {
      await bank.disconnect(connection.id);
      setNotice(`Disconnected ${connection.institution.name}. Expenses you already imported stay.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't disconnect.");
    } finally {
      setWorking(false);
    }
  };

  const connections = bank.connections;

  return (
    <section id="banks" className="bg-panel border border-line rounded-lg p-6 scroll-mt-24">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
            <BankIcon className="w-5 h-5 text-accent" />
            Connected banks
          </h2>
          <p className="text-sm text-ink-muted">Link a bank to bring in its transactions. You review them before they&apos;re saved.</p>
        </div>
        <button
          type="button"
          onClick={() => void openConnect()}
          disabled={working}
          className="self-start shrink-0 px-4 py-2 bg-accent text-accent-ink rounded-full hover:bg-accent-strong disabled:opacity-50 transition-colors text-sm font-medium"
        >
          Connect a bank
        </button>
      </div>

      {connections === null ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : connections.length === 0 ? (
        <p className="text-sm text-ink-muted">No banks connected yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {connections.map((c) => (
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
                <button type="button" onClick={() => void disconnect(c)} disabled={working} className={`${OUTLINE} self-start sm:self-auto`}>
                  Disconnect
                </button>
              </li>
            ))}
          </ul>
          <Link href="/import" className="mt-3 inline-block text-sm text-accent hover:text-accent-strong">
            Import new transactions
          </Link>
        </>
      )}

      <div aria-live="polite">
        {working && <p className="mt-3 text-sm text-ink-soft">Working…</p>}
        {notice && <p className="mt-3 text-sm text-ink-soft">{notice}</p>}
        {bank.error && <p className="mt-2 text-sm text-red-400">{bank.error}</p>}
      </div>

      {dialog && <ConnectBankDialog {...dialog} onPick={(i) => void pick(i)} onClose={() => setDialog(null)} />}
    </section>
  );
}
