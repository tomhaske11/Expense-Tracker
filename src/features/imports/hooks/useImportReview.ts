'use client';

import { useCallback, useRef, useState } from 'react';
import { getExpensesSnapshot, useExpenses } from '@/features/expenses/hooks/useExpenses';
import { ExpenseCategory } from '@/features/expenses/types';
import { formatCurrency } from '@/lib/utils';
import { applySuggestions, buildReview, fileRowId, toExpenses } from '@/features/imports/lib/pipeline';
import {
  MAX_STATEMENT_BYTES,
  ParsedStatement,
  applyMapping,
  guessMapping,
  parseCsv,
  parseOfx,
  statementKind,
} from '@/features/imports/lib/statements';
import {
  BankConnectionView,
  ColumnMapping,
  PdfStatement,
  SUGGEST_MAX_ITEMS,
  Suggestions,
  SyncResponse,
} from '@/features/imports/lib/protocol';
import { ImportBatch, ImportOrigin, ReviewItem, SourceTransaction } from '@/features/imports/types';

/*
 * One import session, from any source: load a batch (statement file or bank sync), review it
 * (pipeline + Claude suggestions for unfamiliar vendors), then save the approved items through
 * useExpenses. For bank syncs, the cursor is acknowledged only after the save.
 */

class ImportFailure extends Error {}

async function postJson<T>(url: string, body: unknown, fallback: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new ImportFailure("Couldn't reach the server. Is it running?");
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : fallback;
    throw new ImportFailure(message);
  }
  return data as T;
}

const toBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

/** Read a statement file into transactions (CSV/OFX in the browser; PDF via the server). */
async function readStatement(file: File): Promise<ParsedStatement> {
  if (file.size > MAX_STATEMENT_BYTES) throw new ImportFailure('That file is over 5 MB. Try a shorter date range.');
  const buffer = await file.arrayBuffer();
  const head = new TextDecoder().decode(buffer.slice(0, 1024));
  const kind = statementKind(file.name, head);
  if (!kind) throw new ImportFailure('Choose a CSV, OFX/QFX or PDF statement.');

  if (kind === 'ofx') return parseOfx(new TextDecoder().decode(buffer));
  if (kind === 'csv') {
    const rows = parseCsv(new TextDecoder().decode(buffer));
    if (rows.length < 2) throw new ImportFailure('That file has no transactions in it.');
    // Recognized layouts are parsed locally; otherwise only the first rows go to Claude.
    const mapping = guessMapping(rows) ?? (await postJson<ColumnMapping>('/api/imports/columns', { rows: rows.slice(0, 12).map((r) => r.slice(0, 40)) }, "Couldn't read this statement's columns."));
    return applyMapping(rows, mapping);
  }
  const pdf = await postJson<PdfStatement>('/api/imports/pdf', { data: toBase64(buffer) }, "Couldn't read that PDF.");
  const seen = new Map<string, number>();
  const transactions: SourceTransaction[] = pdf.transactions.map((t) => {
    const base = `${t.date}|${t.amount}|${t.description}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { externalId: fileRowId('pdf', t.date, t.amount, t.description, n), accountId: 'pdf', date: t.date, amount: t.amount, currency: pdf.currency || 'USD', description: t.description, pending: false };
  });
  return { transactions, unreadable: [] };
}

export type ImportPhase = 'idle' | 'loading' | 'review' | 'done' | 'error';

export interface ImportSession {
  phase: ImportPhase;
  origin: ImportOrigin | null;
  items: ReviewItem[];
  /** Claude is still naming unfamiliar vendors. */
  suggesting: boolean;
  /** Statement rows that couldn't be read. */
  unreadable: number;
  message: string | null;
  loadingLabel: string | null;
}

const IDLE: ImportSession = { phase: 'idle', origin: null, items: [], suggesting: false, unreadable: 0, message: null, loadingLabel: null };

export function useImportReview(onSynced?: (connection: BankConnectionView) => void) {
  const { importExpenses } = useExpenses();
  const [session, setSession] = useState<ImportSession>(IDLE);
  const edited = useRef(new Set<string>());
  const cursor = useRef<string | null>(null);
  const run = useRef(0);

  const review = useCallback(async (batch: ImportBatch, unreadable: number) => {
    const id = ++run.current;
    edited.current = new Set();
    const { items, needsSuggestion } = buildReview(batch, getExpensesSnapshot());
    setSession({ ...IDLE, phase: 'review', origin: batch.origin, items, unreadable, suggesting: needsSuggestion.length > 0 });
    if (needsSuggestion.length === 0) return;

    for (let i = 0; i < needsSuggestion.length; i += SUGGEST_MAX_ITEMS) {
      try {
        const { suggestions } = await postJson<Suggestions>('/api/imports/suggest', { items: needsSuggestion.slice(i, i + SUGGEST_MAX_ITEMS) }, 'Categorizing failed.');
        if (run.current !== id) return;
        setSession((s) => ({ ...s, items: applySuggestions(s.items, suggestions as { key: string; category: ExpenseCategory; description: string }[], edited.current) }));
      } catch (error) {
        if (run.current !== id) return;
        // Not fatal: items keep their tidied names and can be edited by hand.
        setSession((s) => ({ ...s, message: `${error instanceof Error ? error.message : 'Categorizing failed.'} You can still set categories by hand.` }));
        break;
      }
    }
    if (run.current === id) setSession((s) => ({ ...s, suggesting: false }));
  }, []);

  const fromFile = useCallback(
    async (file: File) => {
      const id = ++run.current;
      cursor.current = null;
      setSession({ ...IDLE, phase: 'loading', loadingLabel: `Reading ${file.name}…` });
      try {
        const parsed = await readStatement(file);
        if (run.current !== id) return;
        if (parsed.transactions.length === 0) throw new ImportFailure('No transactions found in that file.');
        await review({ origin: { kind: 'file', fileName: file.name, label: file.name }, transactions: parsed.transactions }, parsed.unreadable.length);
      } catch (error) {
        if (run.current === id) setSession({ ...IDLE, phase: 'error', message: error instanceof ImportFailure ? error.message : "Couldn't read that file." });
      }
    },
    [review]
  );

  const fromBank = useCallback(
    async (connection: BankConnectionView) => {
      const id = ++run.current;
      setSession({ ...IDLE, phase: 'loading', loadingLabel: `Syncing ${connection.institution.name}…` });
      try {
        const sync = await postJson<SyncResponse>('/api/bank/sync', { connectionId: connection.id }, 'Sync failed.');
        if (run.current !== id) return;
        cursor.current = sync.nextCursor;
        await review({ origin: { kind: 'bank', connectionId: connection.id, label: connection.institution.name }, transactions: sync.transactions }, 0);
      } catch (error) {
        if (run.current === id) setSession({ ...IDLE, phase: 'error', message: error instanceof ImportFailure ? error.message : 'Sync failed.' });
      }
    },
    [review]
  );

  const update = useCallback((key: string, patch: Partial<Pick<ReviewItem, 'include' | 'category' | 'description'>>) => {
    if (patch.category !== undefined || patch.description !== undefined) edited.current.add(key);
    setSession((s) => ({ ...s, items: s.items.map((item) => (item.key === key ? { ...item, ...patch } : item)) }));
  }, []);

  const confirm = useCallback(async () => {
    const { origin, items } = session;
    if (!origin) return;
    const expenses = toExpenses(items, origin);
    importExpenses(expenses, 'merge');
    let note = '';
    if (origin.kind === 'bank' && cursor.current) {
      try {
        const connection = await postJson<BankConnectionView>('/api/bank/ack', { connectionId: origin.connectionId, cursor: cursor.current }, 'Saving the sync position failed.');
        onSynced?.(connection);
      } catch {
        note = ' The sync position wasn’t saved, so these may be offered again; they’ll be recognized as already imported.';
      }
    }
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    setSession({
      ...IDLE,
      phase: 'done',
      message:
        (expenses.length === 0
          ? `Nothing imported from ${origin.label}.`
          : `Imported ${expenses.length} expense${expenses.length === 1 ? '' : 's'} (${formatCurrency(total)}) from ${origin.label}.`) + note,
    });
  }, [session, importExpenses, onSynced]);

  const cancel = useCallback(() => {
    run.current++;
    setSession(IDLE);
  }, []);

  return { session, fromFile, fromBank, update, confirm, cancel };
}
