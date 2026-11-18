'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { getSupabaseBrowser } from '@/integrations/supabase/browser';

/*
 * The user's daily budget for the budget streak, stored in their account
 * (public.user_settings), so it follows them across devices. Shared module store, loaded once.
 */

export const DEFAULT_DAILY_BUDGET = 50;

const listeners = new Set<() => void>();
let budget = DEFAULT_DAILY_BUDGET;
let loaded = false;

function load() {
  if (loaded) return;
  loaded = true;
  void getSupabaseBrowser()
    .from('user_settings')
    .select('daily_budget')
    .maybeSingle()
    .then(({ data }) => {
      const value = Number(data?.daily_budget);
      if (Number.isFinite(value) && value > 0) {
        budget = value;
        listeners.forEach((l) => l());
      }
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  load();
  return () => {
    listeners.delete(listener);
  };
}

export function useDailyBudget() {
  const dailyBudget = useSyncExternalStore(subscribe, () => budget, () => DEFAULT_DAILY_BUDGET);

  const setDailyBudget = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const previous = budget;
    budget = Math.round(amount * 100) / 100;
    listeners.forEach((l) => l());
    void (async () => {
      const supabase = getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;
      const { error } = await supabase.from('user_settings').upsert({ user_id: userId, daily_budget: budget });
      if (error) {
        budget = previous;
        listeners.forEach((l) => l());
      }
    })();
  }, []);

  return { dailyBudget, setDailyBudget };
}
