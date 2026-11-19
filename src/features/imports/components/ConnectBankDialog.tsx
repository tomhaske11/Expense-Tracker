'use client';

import { BankIcon, CloseIcon } from '@/lib/icons';
import type { BankInstitution } from '@/features/imports/lib/protocol';

/** Pick a bank to link. A real provider will open its own secure window here instead. */
export default function ConnectBankDialog({
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
