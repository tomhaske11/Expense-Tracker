import { z } from 'zod';
import { format, isValid, parseISO } from 'date-fns';
import { Expense, ExpenseCategory } from '@/features/expenses/types';
import { EXPENSE_CATEGORIES } from '@/features/expenses/constants';
import { generateId } from '@/lib/utils';

/*
 * Full-fidelity backups and restore. A backup is a versioned JSON file with every expense
 * field plus settings. Restore also accepts the older JSON export ({ expenses: [...] } without
 * timestamps) and a bare array of expenses, validating every record before anything is saved.
 */

export const BACKUP_APP = 'expenseAI';
export const BACKUP_VERSION = 1;
/** Largest backup file restore will read. */
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

export interface BackupFile {
  app: typeof BACKUP_APP;
  kind: 'backup';
  version: number;
  exportedAt: string;
  settings: { dailyBudget: number };
  expenses: Expense[];
}

export function buildBackup(expenses: Expense[], dailyBudget: number, now = new Date()): BackupFile {
  return {
    app: BACKUP_APP,
    kind: 'backup',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    settings: { dailyBudget },
    expenses,
  };
}

export const backupFilename = (now = new Date()) => `expenseai-backup-${format(now, 'yyyy-MM-dd')}.json`;

/** One record as found in a file: loosely typed, checked field by field below. */
const RawExpense = z.looseObject({
  id: z.unknown().optional(),
  date: z.unknown(),
  amount: z.unknown(),
  category: z.unknown(),
  description: z.unknown(),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
  source: z.unknown().optional(),
});

const SourceSchema = z.object({
  kind: z.enum(['file', 'bank']),
  externalId: z.string().min(1).max(200),
  connectionId: z.string().max(200).optional(),
  accountId: z.string().max(200).optional(),
  rawDescription: z.string().max(300).optional(),
});

export interface RestorePlan {
  /** Where the file came from. */
  source: 'backup' | 'export' | 'list';
  exportedAt: string | null;
  /** Valid records in the file, in file order, with duplicates inside the file removed. */
  records: Expense[];
  /** Valid records not already in the app (what "Add new" would add). */
  newRecords: Expense[];
  /** Valid records that match an expense already in the app. */
  alreadyPresent: number;
  /** Records that couldn't be read, with a reason (1-based position in the file). */
  skipped: { position: number; reason: string }[];
  /** Records whose unknown category was changed to Other. */
  recategorized: number;
  dailyBudget: number | null;
}

export class RestoreError extends Error {}

const isIsoTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

/** Same expense if same id, or same day, amount, category and description. */
const fingerprint = (e: Pick<Expense, 'date' | 'amount' | 'category' | 'description'>) =>
  `${e.date}|${Math.round(e.amount * 100)}|${e.category}|${e.description.trim().toLowerCase()}`;

function readRecord(raw: unknown, nowIso: string): { expense: Expense; recategorized: boolean } | { error: string } {
  const parsed = RawExpense.safeParse(raw);
  if (!parsed.success) return { error: 'not an expense record' };
  const r = parsed.data;

  if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !isValid(parseISO(r.date))) {
    return { error: 'missing or invalid date' };
  }
  const amount = typeof r.amount === 'string' ? Number(r.amount) : r.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return { error: 'amount must be a number above 0' };
  }
  if (typeof r.description !== 'string' || !r.description.trim()) return { error: 'missing description' };

  const known = EXPENSE_CATEGORIES.includes(r.category as ExpenseCategory);
  const createdAt = isIsoTimestamp(r.createdAt) ? r.createdAt : nowIso;
  const source = SourceSchema.safeParse(r.source);
  return {
    expense: {
      id: typeof r.id === 'string' && r.id.trim() ? r.id : generateId(),
      date: r.date,
      amount: Math.round(amount * 100) / 100,
      category: known ? (r.category as ExpenseCategory) : 'Other',
      description: r.description.trim().slice(0, 200),
      createdAt,
      updatedAt: isIsoTimestamp(r.updatedAt) ? r.updatedAt : createdAt,
      ...(source.success && { source: source.data }),
    },
    recategorized: !known,
  };
}

/** Read a backup or export file's text and work out what restoring it would do. */
export function planRestore(text: string, existing: Expense[], now = new Date()): RestorePlan {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new RestoreError("That file isn't valid JSON. Choose an expenseAI backup (.json).");
  }

  let source: RestorePlan['source'];
  let rawRecords: unknown[];
  let exportedAt: string | null = null;
  let dailyBudget: number | null = null;

  if (Array.isArray(data)) {
    source = 'list';
    rawRecords = data;
  } else if (data && typeof data === 'object' && Array.isArray((data as { expenses?: unknown }).expenses)) {
    const file = data as Record<string, unknown> & { expenses: unknown[] };
    rawRecords = file.expenses;
    if (file.app === BACKUP_APP && file.kind === 'backup') {
      source = 'backup';
      if (typeof file.version === 'number' && file.version > BACKUP_VERSION) {
        throw new RestoreError('This backup was made by a newer version of expenseAI. Update the app, then try again.');
      }
      const budget = (file.settings as { dailyBudget?: unknown } | undefined)?.dailyBudget;
      if (typeof budget === 'number' && Number.isFinite(budget) && budget > 0) dailyBudget = budget;
    } else {
      source = 'export';
    }
    const stamp = file.exportedAt ?? file.exportDate;
    if (isIsoTimestamp(stamp)) exportedAt = stamp;
  } else {
    throw new RestoreError("That file doesn't contain any expenses.");
  }

  if (rawRecords.length === 0) throw new RestoreError('That file has no expenses in it.');

  const nowIso = now.toISOString();
  const existingIds = new Set(existing.map((e) => e.id));
  const existingPrints = new Set(existing.map(fingerprint));
  const seenIds = new Set<string>();
  const seenPrints = new Set<string>();

  const records: Expense[] = [];
  const newRecords: Expense[] = [];
  const skipped: RestorePlan['skipped'] = [];
  let alreadyPresent = 0;
  let recategorized = 0;

  rawRecords.forEach((raw, index) => {
    const result = readRecord(raw, nowIso);
    if ('error' in result) {
      skipped.push({ position: index + 1, reason: result.error });
      return;
    }
    const { expense } = result;
    const print = fingerprint(expense);
    // Duplicate inside the file itself: keep the first copy only.
    if (seenIds.has(expense.id) || seenPrints.has(print)) {
      skipped.push({ position: index + 1, reason: 'duplicate of an earlier record in the file' });
      return;
    }
    seenIds.add(expense.id);
    seenPrints.add(print);
    if (result.recategorized) recategorized++;

    records.push(expense);
    if (existingIds.has(expense.id) || existingPrints.has(print)) alreadyPresent++;
    else newRecords.push(expense);
  });

  if (records.length === 0) {
    throw new RestoreError(`None of the ${rawRecords.length} records in that file could be read.`);
  }

  return { source, exportedAt, records, newRecords, alreadyPresent, skipped, recategorized, dailyBudget };
}

/**
 * When the app should nudge for a backup: never backed up (with at least `minExpenses`), or the
 * last backup is over 30 days old and something changed since. Snoozing hides it until a date.
 */
export function needsBackupReminder(
  expenses: Expense[],
  status: { lastBackupAt: string | null; snoozedUntil: string | null },
  now = new Date(),
  minExpenses = 5
): { due: boolean; daysSince: number | null } {
  if (expenses.length < minExpenses) return { due: false, daysSince: null };
  if (status.snoozedUntil && Date.parse(status.snoozedUntil) > now.getTime()) return { due: false, daysSince: null };
  if (!status.lastBackupAt) return { due: true, daysSince: null };

  const last = Date.parse(status.lastBackupAt);
  const daysSince = Math.floor((now.getTime() - last) / 86_400_000);
  const latestChange = Math.max(...expenses.map((e) => Date.parse(e.updatedAt) || 0));
  return { due: daysSince >= 30 && latestChange > last, daysSince };
}
