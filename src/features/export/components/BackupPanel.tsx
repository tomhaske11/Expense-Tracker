'use client';

import { useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Expense } from '@/features/expenses/types';
import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AlertIcon, CheckCircleIcon, DownloadIcon, FileIcon } from '@/lib/icons';
import { ExportService } from '@/features/export/lib/exportService';
import { useBackupStatus } from '@/features/export/hooks/useBackupStatus';
import {
  MAX_BACKUP_BYTES,
  RestoreError,
  RestorePlan,
  backupFilename,
  buildBackup,
  needsBackupReminder,
  planRestore,
} from '@/features/export/lib/backup';

interface BackupPanelProps {
  expenses: Expense[];
  /** Current daily budget, saved in backups (owned by analytics, so passed in). */
  dailyBudget: number;
  onRestoreBudget: (amount: number) => void;
  onOpenExport: () => void;
}

type Stage =
  | { kind: 'idle' }
  | { kind: 'preview'; plan: RestorePlan; fileName: string }
  | { kind: 'confirm-replace'; plan: RestorePlan; fileName: string }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

const OUTLINE =
  'px-4 py-2 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors text-sm font-medium flex items-center gap-2';

function download(expenses: Expense[], dailyBudget: number, filename: string) {
  ExportService.downloadFile(JSON.stringify(buildBackup(expenses, dailyBudget), null, 2), filename, 'application/json');
}

/** Back up now, restore from a backup (with preview), open the export modal, and the backup reminder. */
export default function BackupPanel({ expenses, dailyBudget, onRestoreBudget, onOpenExport }: BackupPanelProps) {
  const { importExpenses } = useExpenses();
  const { status, markBackedUp, snooze } = useBackupStatus();
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [restoreBudget, setRestoreBudget] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const reminder = needsBackupReminder(expenses, status);
  const empty = expenses.length === 0;

  const backUpNow = () => {
    download(expenses, dailyBudget, backupFilename());
    markBackedUp();
    setStage({ kind: 'done', message: `Backed up ${expenses.length} expenses. Keep the file somewhere safe, like cloud storage.` });
  };

  const chooseFile = async (file: File) => {
    if (file.size > MAX_BACKUP_BYTES) {
      setStage({ kind: 'error', message: 'That file is over 10 MB, which is too large to be an expenseAI backup.' });
      return;
    }
    try {
      const plan = planRestore(await file.text(), expenses);
      setRestoreBudget(plan.dailyBudget !== null && plan.dailyBudget !== dailyBudget);
      setStage({ kind: 'preview', plan, fileName: file.name });
    } catch (error) {
      setStage({
        kind: 'error',
        message: error instanceof RestoreError ? error.message : "Couldn't read that file. Choose an expenseAI backup (.json).",
      });
    }
  };

  const finish = (plan: RestorePlan, mode: 'merge' | 'replace') => {
    if (mode === 'replace' && expenses.length > 0) {
      // Safety net: keep a copy of what's about to be replaced.
      download(expenses, dailyBudget, backupFilename().replace('backup', 'before-restore'));
    }
    const added = mode === 'replace' ? plan.records.length : plan.newRecords.length;
    importExpenses(mode === 'replace' ? plan.records : plan.newRecords, mode);
    const budgetRestored = restoreBudget && plan.dailyBudget !== null;
    if (budgetRestored) onRestoreBudget(plan.dailyBudget!);
    setStage({
      kind: 'done',
      message:
        (mode === 'replace'
          ? `Replaced your data with ${added} expenses from the backup. A copy of your previous data was downloaded first.`
          : added === 0
            ? 'Nothing new to add: every expense in the backup is already here.'
            : `Added ${added} expenses from the backup.`) + (budgetRestored ? ` Daily budget set to ${formatCurrency(plan.dailyBudget!)}.` : ''),
    });
  };

  return (
    <div
      className={`bg-panel border rounded-lg p-6 ${reminder.due ? 'border-amber-500/40' : 'border-line'}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-ink mb-1">{empty ? 'Restore your data' : 'Back up & export'}</h3>
          <p className="text-sm text-ink-muted">
            {empty
              ? 'New device or cleared browser? Restore from an expenseAI backup file.'
              : status.lastBackupAt
                ? `Last backup ${formatDistanceToNow(new Date(status.lastBackupAt), { addSuffix: true })}. Your expenses are stored only in this browser.`
                : 'Not backed up yet. Your expenses are stored only in this browser, so a backup is your only copy.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!empty && (
            <button
              type="button"
              onClick={backUpNow}
              className="px-4 py-2 bg-accent text-accent-ink rounded-full hover:bg-accent-strong transition-colors text-sm font-medium flex items-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" />
              Back up now
            </button>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={empty ? OUTLINE.replace('border-line text-ink-soft', 'border-accent text-accent') : OUTLINE}
          >
            <FileIcon className="w-4 h-4" />
            Restore
          </button>
          {!empty && (
            <button type="button" onClick={onOpenExport} className={OUTLINE}>
              Export CSV, JSON, PDF
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Backup file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void chooseFile(file);
            }}
          />
        </div>
      </div>

      {reminder.due && stage.kind === 'idle' && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-300 flex items-start gap-2">
            <AlertIcon className="w-4 h-4 mt-0.5 shrink-0" />
            {reminder.daysSince === null
              ? `You have ${expenses.length} expenses and no backup. If this browser's data is cleared, they're gone.`
              : `It's been ${reminder.daysSince} days since your last backup, and your data has changed.`}
          </p>
          <button type="button" onClick={() => snooze(7)} className="text-sm text-ink-muted hover:text-ink shrink-0">
            Remind me in a week
          </button>
        </div>
      )}

      <div aria-live="polite">
        {(stage.kind === 'preview' || stage.kind === 'confirm-replace') && (
          <RestorePreview
            plan={stage.plan}
            fileName={stage.fileName}
            currentCount={expenses.length}
            dailyBudget={dailyBudget}
            restoreBudget={restoreBudget}
            onToggleBudget={setRestoreBudget}
            confirmingReplace={stage.kind === 'confirm-replace'}
            onMerge={() => finish(stage.plan, 'merge')}
            onReplace={() =>
              stage.kind === 'confirm-replace' || expenses.length === 0
                ? finish(stage.plan, 'replace')
                : setStage({ kind: 'confirm-replace', plan: stage.plan, fileName: stage.fileName })
            }
            onCancel={() => setStage({ kind: 'idle' })}
          />
        )}
        {stage.kind === 'done' && (
          <p className="mt-4 text-sm text-accent flex items-start gap-2">
            <CheckCircleIcon className="w-4 h-4 mt-0.5 shrink-0" />
            {stage.message}
          </p>
        )}
        {stage.kind === 'error' && <p className="mt-4 text-sm text-red-400">{stage.message}</p>}
      </div>
    </div>
  );
}

interface RestorePreviewProps {
  plan: RestorePlan;
  fileName: string;
  currentCount: number;
  dailyBudget: number;
  restoreBudget: boolean;
  onToggleBudget: (value: boolean) => void;
  confirmingReplace: boolean;
  onMerge: () => void;
  onReplace: () => void;
  onCancel: () => void;
}

function RestorePreview({
  plan,
  fileName,
  currentCount,
  dailyBudget,
  restoreBudget,
  onToggleBudget,
  confirmingReplace,
  onMerge,
  onReplace,
  onCancel,
}: RestorePreviewProps) {
  const sourceLabel = { backup: 'expenseAI backup', export: 'JSON export', list: 'list of expenses' }[plan.source];
  return (
    <div className="mt-4 rounded-lg border border-line bg-panel-raised p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-ink">{fileName}</p>
        <p className="text-xs text-ink-muted">
          {sourceLabel}
          {plan.exportedAt && ` · saved ${formatDate(plan.exportedAt.slice(0, 10))}`} · {plan.records.length} readable expenses
        </p>
      </div>

      <ul className="text-sm text-ink-soft space-y-1">
        <li>
          <span className="font-semibold text-ink">{plan.newRecords.length}</span> new
          {plan.alreadyPresent > 0 && (
            <>
              , <span className="font-semibold text-ink">{plan.alreadyPresent}</span> already in the app
            </>
          )}
        </li>
        {plan.recategorized > 0 && <li>{plan.recategorized} with an unknown category will be filed under Other</li>}
        {plan.skipped.length > 0 && (
          <li className="text-amber-300">
            {plan.skipped.length} skipped:{' '}
            {plan.skipped
              .slice(0, 3)
              .map((s) => `#${s.position} ${s.reason}`)
              .join('; ')}
            {plan.skipped.length > 3 && `; and ${plan.skipped.length - 3} more`}
          </li>
        )}
      </ul>

      {plan.dailyBudget !== null && plan.dailyBudget !== dailyBudget && (
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            className="h-4 w-4 accent-teal-400"
            checked={restoreBudget}
            onChange={(e) => onToggleBudget(e.target.checked)}
          />
          Also restore the daily budget ({formatCurrency(plan.dailyBudget)}, currently {formatCurrency(dailyBudget)})
        </label>
      )}

      {confirmingReplace ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 space-y-2">
          <p className="text-sm text-red-300">
            This deletes your {currentCount} current expenses and replaces them with the {plan.records.length} from the
            backup. A copy of your current data downloads first.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReplace}
              className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Yes, replace {currentCount} expenses
            </button>
            <button type="button" onClick={onCancel} className={OUTLINE}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onMerge}
            disabled={plan.newRecords.length === 0 && !(restoreBudget && plan.dailyBudget !== null)}
            className="px-4 py-2 bg-accent text-accent-ink rounded-full hover:bg-accent-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {currentCount === 0 ? `Restore ${plan.records.length} expenses` : `Add ${plan.newRecords.length} new`}
          </button>
          {currentCount > 0 && (
            <button type="button" onClick={onReplace} className={OUTLINE}>
              Replace all my data
            </button>
          )}
          <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-ink-muted hover:text-ink">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
