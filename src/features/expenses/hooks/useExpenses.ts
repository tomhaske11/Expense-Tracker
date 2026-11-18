'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { Expense, ExpenseFormData } from '@/features/expenses/types';
import { STORAGE_KEY } from '@/features/expenses/constants';
import { generateId } from '@/lib/utils';

/*
 * localStorage-backed store shared by every useExpenses() caller.
 *
 * Reads go through useSyncExternalStore, so components subscribe to storage
 * rather than copying it into state on mount. The server snapshot is `null`,
 * which renders the loading state during SSR and hydration; the client then
 * re-renders with the stored data.
 */

const listeners = new Set<() => void>();

// Cache keyed on the raw string so getSnapshot returns a stable reference
// until the stored value actually changes.
let cachedRaw: string | null | undefined;
let cachedExpenses: Expense[] = [];

function readExpenses(): Expense[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to load expenses:', error);
    return cachedExpenses;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedExpenses = raw ? (JSON.parse(raw) as Expense[]) : [];
    } catch (error) {
      // Corrupt data is left in storage untouched; it is only replaced on the next write.
      console.error('Failed to parse stored expenses:', error);
      cachedExpenses = [];
    }
  }
  return cachedExpenses;
}

function writeExpenses(update: (prev: Expense[]) => Expense[]) {
  const next = update(readExpenses());
  try {
    const raw = JSON.stringify(next);
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
  } catch (error) {
    // Storage is unavailable or full: keep the change in memory for this session.
    console.error('Failed to save expenses:', error);
  }
  cachedExpenses = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Pick up changes made in other tabs.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

const getServerSnapshot = () => null;

/**
 * Current expenses, read outside React (e.g. by assistant tools mid-conversation, which
 * need the latest data rather than the value from the last render). Browser only.
 */
export const getExpensesSnapshot = readExpenses;

const EMPTY: Expense[] = [];

export function useExpenses() {
  const snapshot = useSyncExternalStore<Expense[] | null>(subscribe, readExpenses, getServerSnapshot);
  const isLoading = snapshot === null;
  const expenses = snapshot ?? EMPTY;

  const addExpense = useCallback((formData: ExpenseFormData) => {
    const now = new Date().toISOString();
    const newExpense: Expense = {
      id: generateId(),
      date: formData.date,
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description,
      createdAt: now,
      updatedAt: now,
    };

    writeExpenses((prev) => [newExpense, ...prev]);
    return newExpense;
  }, []);

  const updateExpense = useCallback((id: string, formData: ExpenseFormData) => {
    writeExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id
          ? {
              ...expense,
              date: formData.date,
              amount: parseFloat(formData.amount),
              category: formData.category,
              description: formData.description,
              updatedAt: new Date().toISOString(),
            }
          : expense
      )
    );
  }, []);

  const deleteExpense = useCallback((id: string) => {
    writeExpenses((prev) => prev.filter((expense) => expense.id !== id));
  }, []);

  const clearAllExpenses = useCallback(() => {
    writeExpenses(() => []);
  }, []);

  return {
    expenses,
    isLoading,
    addExpense,
    updateExpense,
    deleteExpense,
    clearAllExpenses,
  };
}
