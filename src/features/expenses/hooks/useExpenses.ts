'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Expense, ExpenseFormData, ExpenseSource } from '@/features/expenses/types';
import { STORAGE_KEY } from '@/features/expenses/constants';
import { generateId } from '@/lib/utils';
import { getSupabaseBrowser } from '@/integrations/supabase/browser';

/*
 * The signed-in user's expenses, stored in Supabase (public.expenses, row-level security).
 * A module-level store shared by every useExpenses() caller, read through useSyncExternalStore:
 *  - loads on the first subscriber; the snapshot is null (isLoading) until it has;
 *  - mutations apply instantly (optimistic) and persist in the background; if the server
 *    rejects one, it's rolled back and `error` explains what happened;
 *  - realtime changes from the user's other devices trigger a refetch;
 *  - signing out clears the cache.
 * The snapshot is a stable reference that only changes when the data does.
 */

interface ExpenseRow {
  id: string;
  date: string;
  amount: number | string;
  category: Expense['category'];
  description: string;
  source: ExpenseSource | null;
  created_at: string;
  updated_at: string;
}

const fromRow = (r: ExpenseRow): Expense => ({
  id: r.id,
  date: r.date,
  amount: Number(r.amount),
  category: r.category,
  description: r.description,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  ...(r.source && { source: r.source }),
});

const toRow = (e: Expense) => ({
  id: e.id,
  date: e.date,
  amount: e.amount,
  category: e.category,
  description: e.description,
  source: e.source ?? null,
  created_at: e.createdAt,
  updated_at: e.updatedAt,
});

const PAGE = 1000;
const listeners = new Set<() => void>();
let expenses: Expense[] | null = null;
let error: string | null = null;
let userId: string | null = null;
let loading: Promise<void> | null = null;
let channel: RealtimeChannel | null = null;
let pendingWrites = 0;
let refetchAfterWrites = false;
let authWatching = false;

const notify = () => listeners.forEach((l) => l());

function setExpenses(next: Expense[]) {
  expenses = next;
  notify();
}

function fail(message: string, rollback: () => void) {
  rollback();
  error = message;
  notify();
}

async function fetchAll(): Promise<Expense[]> {
  const rows: ExpenseRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error: e } = await getSupabaseBrowser()
      .from('expenses')
      .select('id, date, amount, category, description, source, created_at, updated_at')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (e) throw e;
    rows.push(...(data as ExpenseRow[]));
    if (!data || data.length < PAGE) break;
  }
  return rows.map(fromRow);
}

async function load() {
  const supabase = getSupabaseBrowser();
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id ?? null;
  if (!uid) {
    // Signed out: nothing to show (the proxy sends signed-out users to /login).
    userId = null;
    setExpenses([]);
    return;
  }
  userId = uid;
  try {
    setExpenses(await fetchAll());
    error = null;
  } catch {
    error = "Couldn't load your expenses. Check your connection and reload.";
    setExpenses(expenses ?? []);
  }
  listenForChanges(uid);
}

function ensureLoaded() {
  loading ??= load().finally(() => {
    loading = null;
  });
  return loading;
}

/** Another device changed something: refetch (after any of our own writes finish). */
function refetch() {
  if (pendingWrites > 0) {
    refetchAfterWrites = true;
    return;
  }
  fetchAll()
    .then((next) => setExpenses(next))
    .catch(() => undefined);
}

let refetchTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleRefetch() {
  if (refetchTimer) clearTimeout(refetchTimer);
  refetchTimer = setTimeout(refetch, 400);
}

function listenForChanges(uid: string) {
  if (channel) return;
  channel = getSupabaseBrowser()
    .channel(`expenses:${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${uid}` }, scheduleRefetch)
    .subscribe();
}

function watchAuth() {
  if (authWatching) return;
  authWatching = true;
  getSupabaseBrowser().auth.onAuthStateChange((event, session) => {
    const uid = session?.user.id ?? null;
    if (uid === userId) return;
    // Signed out, or a different user signed in: drop everything cached for the old user.
    if (channel) void getSupabaseBrowser().removeChannel(channel);
    channel = null;
    userId = null;
    expenses = null;
    error = null;
    notify();
    if (uid && listeners.size > 0) void ensureLoaded();
  });
}

/** Run a server write; on failure roll back the optimistic change. */
async function persist(write: () => PromiseLike<{ error: { message: string; code?: string } | null }>, rollback: () => void, failure: string) {
  pendingWrites++;
  try {
    const { error: e } = await write();
    if (e) fail(failure, rollback);
  } catch {
    fail(failure, rollback);
  } finally {
    pendingWrites--;
    if (pendingWrites === 0 && refetchAfterWrites) {
      refetchAfterWrites = false;
      refetch();
    }
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  watchAuth();
  if (expenses === null) void ensureLoaded();
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => expenses;
const getServerSnapshot = () => null;
const getErrorSnapshot = () => error;
const getNullError = () => null;

/** Current expenses, read outside React (assistant tools, imports). Empty until loaded. */
export const getExpensesSnapshot = (): Expense[] => expenses ?? [];

const EMPTY: Expense[] = [];

function fromForm(formData: ExpenseFormData) {
  return {
    date: formData.date,
    amount: parseFloat(formData.amount),
    category: formData.category,
    description: formData.description.trim(),
  };
}

export function useExpenses() {
  const snapshot = useSyncExternalStore<Expense[] | null>(subscribe, getSnapshot, getServerSnapshot);
  const syncError = useSyncExternalStore(subscribe, getErrorSnapshot, getNullError);
  const isLoading = snapshot === null;

  const addExpense = useCallback((formData: ExpenseFormData) => {
    const now = new Date().toISOString();
    const expense: Expense = { id: generateId(), ...fromForm(formData), createdAt: now, updatedAt: now };
    const before = expenses ?? [];
    setExpenses([expense, ...before]);
    void persist(
      () => getSupabaseBrowser().from('expenses').insert(toRow(expense)),
      () => setExpenses((expenses ?? []).filter((e) => e.id !== expense.id)),
      `Couldn't save "${expense.description}". It was removed; please try again.`
    );
    return expense;
  }, []);

  const updateExpense = useCallback((id: string, formData: ExpenseFormData) => {
    const previous = (expenses ?? []).find((e) => e.id === id);
    if (!previous) return;
    const updated: Expense = { ...previous, ...fromForm(formData), updatedAt: new Date().toISOString() };
    setExpenses((expenses ?? []).map((e) => (e.id === id ? updated : e)));
    const { id: _id, ...changes } = toRow(updated);
    void _id;
    void persist(
      () => getSupabaseBrowser().from('expenses').update(changes).eq('id', id),
      () => setExpenses((expenses ?? []).map((e) => (e.id === id ? previous : e))),
      `Couldn't save your change to "${previous.description}". It was undone.`
    );
  }, []);

  const deleteExpense = useCallback((id: string) => {
    const index = (expenses ?? []).findIndex((e) => e.id === id);
    if (index < 0) return;
    const removed = (expenses ?? [])[index];
    setExpenses((expenses ?? []).filter((e) => e.id !== id));
    void persist(
      () => getSupabaseBrowser().from('expenses').delete().eq('id', id),
      () => {
        const list = [...(expenses ?? [])];
        list.splice(Math.min(index, list.length), 0, removed);
        setExpenses(list);
      },
      `Couldn't delete "${removed.description}". It was restored.`
    );
  }, []);

  /**
   * Add many expenses in one go (restores and imports). 'merge' adds `incoming` (pass only
   * records that aren't already present); 'replace' deletes everything first.
   */
  const importExpenses = useCallback((incoming: Expense[], mode: 'merge' | 'replace') => {
    const before = expenses ?? [];
    setExpenses(mode === 'replace' ? [...incoming] : [...incoming, ...before]);
    void persist(
      async () => {
        const supabase = getSupabaseBrowser();
        if (mode === 'replace' && userId) {
          const { error: e } = await supabase.from('expenses').delete().eq('user_id', userId);
          if (e) return { error: e };
        }
        for (let i = 0; i < incoming.length; i += 500) {
          const { error: e } = await supabase
            .from('expenses')
            .upsert(incoming.slice(i, i + 500).map(toRow), { onConflict: 'user_id,id', ignoreDuplicates: true });
          if (e) return { error: e };
        }
        return { error: null };
      },
      () => {
        // Some rows may have been saved before the failure: show the server's truth.
        setExpenses(before);
        refetch();
      },
      `Couldn't save all ${incoming.length} expenses. Showing what was saved; please try again.`
    );
  }, []);

  const clearAllExpenses = useCallback(() => importExpenses([], 'replace'), [importExpenses]);

  const dismissError = useCallback(() => {
    error = null;
    notify();
  }, []);

  return {
    expenses: snapshot ?? EMPTY,
    isLoading,
    syncError,
    dismissError,
    addExpense,
    updateExpense,
    deleteExpense,
    clearAllExpenses,
    importExpenses,
  };
}

// ---------- Expenses saved in this browser before accounts existed ----------

const MIGRATED_PREFIX = 'expenseai-local-imported:';

/** Expenses left in this browser's localStorage from before accounts. Never modified or deleted here. */
export function readLocalExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Expense[]) : [];
  } catch {
    return [];
  }
}

/** Whether this user has already imported (or dismissed) this browser's local expenses. */
export function localImportHandled(uid: string): boolean {
  try {
    return localStorage.getItem(MIGRATED_PREFIX + uid) !== null;
  } catch {
    return true;
  }
}

export function markLocalImportHandled(uid: string, outcome: 'imported' | 'dismissed') {
  try {
    localStorage.setItem(MIGRATED_PREFIX + uid, JSON.stringify({ outcome, at: new Date().toISOString() }));
  } catch {
    // Storage unavailable: the offer may appear again, which is harmless.
  }
}

/** The signed-in user's id once loaded (for per-user local flags). */
export const getCurrentUserId = () => userId;
