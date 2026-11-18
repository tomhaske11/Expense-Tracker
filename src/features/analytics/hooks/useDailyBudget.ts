'use client';

import { useCallback } from 'react';
import { createStoredValue } from '@/lib/storedValue';

/** The user's daily budget for the budget streak, saved in localStorage. */

export const DEFAULT_DAILY_BUDGET = 50;

const budgetStore = createStoredValue<number>({
  key: 'expense-tracker-daily-budget',
  fallback: DEFAULT_DAILY_BUDGET,
  parse: (raw) => {
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  },
  serialize: String,
});

export function useDailyBudget() {
  const [dailyBudget, save] = budgetStore.useValue();
  const setDailyBudget = useCallback(
    (amount: number) => {
      if (Number.isFinite(amount) && amount > 0) save(Math.round(amount * 100) / 100);
    },
    [save]
  );
  return { dailyBudget, setDailyBudget };
}
