'use client';

import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import { AlertIcon, CloseIcon } from '@/lib/icons';

/** Shows when a save to the server failed (the change was rolled back). */
export default function SyncErrorBanner() {
  const { syncError, dismissError } = useExpenses();
  if (!syncError) return null;
  return (
    <div role="alert" className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
      <span className="flex items-start gap-2">
        <AlertIcon className="w-4 h-4 mt-0.5 shrink-0" />
        {syncError}
      </span>
      <button type="button" onClick={dismissError} aria-label="Dismiss" className="shrink-0 text-red-300 hover:text-red-200">
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
