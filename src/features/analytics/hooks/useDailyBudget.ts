'use client';

import { useCallback, useSyncExternalStore } from 'react';

/*
 * The user's daily budget for the budget streak, kept in localStorage under its own key.
 * Same pattern as useExpenses: a module-level store read through useSyncExternalStore,
 * written only when the user changes it, and synced across tabs by the storage event.
 */

export const DEFAULT_DAILY_BUDGET = 50;
const BUDGET_KEY = 'expense-tracker-daily-budget';

const listeners = new Set<() => void>();

function readBudget(): number {
  try {
    const value = Number(localStorage.getItem(BUDGET_KEY));
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAILY_BUDGET;
  } catch {
    return DEFAULT_DAILY_BUDGET;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === BUDGET_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

const getServerSnapshot = () => DEFAULT_DAILY_BUDGET;

export function useDailyBudget() {
  // A number is a primitive, so the snapshot is stable without caching.
  const dailyBudget = useSyncExternalStore(subscribe, readBudget, getServerSnapshot);

  const setDailyBudget = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const rounded = Math.round(amount * 100) / 100;
    try {
      localStorage.setItem(BUDGET_KEY, String(rounded));
    } catch (error) {
      console.error('Failed to save daily budget:', error);
    }
    listeners.forEach((listener) => listener());
  }, []);

  return { dailyBudget, setDailyBudget };
}
