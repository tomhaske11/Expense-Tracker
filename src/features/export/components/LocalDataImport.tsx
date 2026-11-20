'use client';

import { useState } from 'react';
import { Expense } from '@/features/expenses/types';
import {
  getCurrentUserId,
  localImportHandled,
  markLocalImportHandled,
  readLocalExpenses,
  useExpenses,
} from '@/features/expenses/hooks/useExpenses';
import { formatCurrency } from '@/lib/utils';
import { CheckCircleIcon, UploadIcon } from '@/lib/icons';
import { planRestore } from '@/features/export/lib/backup';

/**
 * One-time offer after signing in: expenses saved in this browser before accounts existed can be
 * imported into the account (duplicates skipped). The browser copy is never deleted.
 */
export default function LocalDataImport({ expenses }: { expenses: Expense[] }) {
  const { importExpenses } = useExpenses();
  const [hidden, setHidden] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  // Planned once when the Account page mounts (expenses are loaded by then), so later edits
  // don't re-open an offer the user already handled.
  const [{ uid, plan }] = useState(() => {
    const id = getCurrentUserId();
    if (!id || localImportHandled(id)) return { uid: id, plan: null };
    const local = readLocalExpenses();
    if (local.length === 0) return { uid: id, plan: null };
    try {
      return { uid: id, plan: planRestore(JSON.stringify(local), expenses) };
    } catch {
      return { uid: id, plan: null };
    }
  });

  if (done) {
    return (
      <p className="text-sm text-accent flex items-start gap-2">
        <CheckCircleIcon className="w-4 h-4 mt-0.5 shrink-0" />
        {done}
      </p>
    );
  }
  if (!plan || hidden || !uid) return null;

  const total = plan.newRecords.reduce((sum, e) => sum + e.amount, 0);
  const importNow = () => {
    importExpenses(plan.newRecords, 'merge');
    markLocalImportHandled(uid, 'imported');
    setDone(`Imported ${plan.newRecords.length} expenses from this browser into your account.`);
  };
  const dismiss = () => {
    markLocalImportHandled(uid, 'dismissed');
    setHidden(true);
  };

  return (
    <div className="bg-panel border border-accent/40 rounded-lg p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
          <UploadIcon className="w-5 h-5 text-accent" />
          Bring your existing expenses into your account
        </h3>
        <p className="text-sm text-ink-muted">
          This browser has {plan.records.length} expenses saved from before you signed in.{' '}
          {plan.newRecords.length > 0
            ? `${plan.newRecords.length} (${formatCurrency(total)}) aren't in your account yet.`
            : 'All of them are already in your account.'}
          {plan.skipped.length > 0 && ` ${plan.skipped.length} couldn't be read and will be skipped.`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {plan.newRecords.length > 0 && (
          <button
            type="button"
            onClick={importNow}
            className="px-4 py-2 bg-accent text-accent-ink rounded-full hover:bg-accent-strong transition-colors text-sm font-medium"
          >
            Import {plan.newRecords.length}
          </button>
        )}
        <button type="button" onClick={() => setHidden(true)} className="px-4 py-2 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors text-sm">
          Not now
        </button>
        <button type="button" onClick={dismiss} className="px-3 py-2 text-sm text-ink-muted hover:text-ink">
          {plan.newRecords.length > 0 ? "Don't ask again" : 'Dismiss'}
        </button>
      </div>
    </div>
  );
}
