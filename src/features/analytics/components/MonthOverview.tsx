'use client';

import { FormEvent, ReactNode, useMemo, useState } from 'react';
import { Expense } from '@/features/expenses/types';
import { BulbIcon, CalendarIcon, PieIcon, TrendIcon, TrophyIcon } from '@/lib/icons';
import { formatCurrency } from '@/lib/utils';
import { calculateBudgetStreak, calculateMonthToDate, suggestDailyBudget } from '@/features/analytics/lib/stats';
import { useDailyBudget } from '@/features/analytics/hooks/useDailyBudget';
import BudgetCoach from '@/features/analytics/components/BudgetCoach';
import CategoryBreakdown from '@/features/analytics/components/CategoryBreakdown';

const CARD = 'bg-panel border border-line rounded-lg p-6';

/** Home: how this month is going against the daily budget, where the money went, and the coach. */
export default function MonthOverview({ expenses, streakGoal = 30 }: { expenses: Expense[]; streakGoal?: number }) {
  const { dailyBudget, setDailyBudget } = useDailyBudget();
  const month = useMemo(() => calculateMonthToDate(expenses), [expenses]);
  const streak = useMemo(() => calculateBudgetStreak(expenses, dailyBudget), [expenses, dailyBudget]);
  const underBudget = month.dailyAverage <= dailyBudget;
  const vsLast = month.total - month.lastMonthTotal;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Tile
          label="Spent this month"
          value={formatCurrency(month.total)}
          icon={<CalendarIcon className="w-6 h-6" />}
          note={
            month.lastMonthTotal > 0
              ? `${month.count} transactions · ${month.lastMonthLabel} total ${formatCurrency(month.lastMonthTotal)}`
              : `${month.count} transactions`
          }
        />
        <Tile
          label="Daily average"
          value={formatCurrency(month.dailyAverage)}
          icon={<TrendIcon className="w-6 h-6" />}
          note={
            <span className={underBudget ? 'text-accent' : 'text-amber-300'}>
              {underBudget ? 'Under' : 'Over'} your {formatCurrency(dailyBudget)}/day budget
            </span>
          }
        />
        <Tile
          label="Budget streak"
          value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
          icon={<TrophyIcon className="w-6 h-6" />}
          note={
            <span className="block">
              <span
                className="block h-1.5 rounded-full bg-line overflow-hidden my-1.5"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={streakGoal}
                aria-valuenow={Math.min(streak, streakGoal)}
                aria-label="Budget streak progress"
              >
                <span className="block h-full bg-accent" style={{ width: `${Math.min(streak / streakGoal, 1) * 100}%` }} />
              </span>
              In a row at or under {formatCurrency(dailyBudget)}/day
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className={`${CARD} lg:col-span-2`}>
          <h2 className="text-lg font-semibold text-ink mb-4">Where it went this month</h2>
          {month.count > 0 ? (
            <CategoryBreakdown expenses={month.expenses} centerLabel={month.label.split(' ')[0]} />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-ink-muted text-center">
              <PieIcon className="w-12 h-12 mb-3 text-ink-faint" />
              <p>No spending recorded in {month.label} yet.</p>
            </div>
          )}
          {month.count > 0 && month.lastMonthTotal > 0 && (
            <p className="mt-4 text-sm text-ink-muted">
              {formatCurrency(Math.abs(vsLast))} {vsLast > 0 ? 'more' : 'less'} than all of {month.lastMonthLabel}, with{' '}
              {month.daysInMonth - month.daysElapsed} days to go.
            </p>
          )}
        </section>

        <div>
          <DailyBudgetCard expenses={expenses} dailyBudget={dailyBudget} onChange={setDailyBudget} />
          <BudgetCoach expenses={expenses} dailyBudget={dailyBudget} />
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, icon, note }: { label: string; value: string; icon: ReactNode; note: ReactNode }) {
  return (
    <div className={CARD}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-widest text-ink-muted mb-2">{label}</p>
          <p className="text-2xl font-semibold text-ink mb-1 tabular-nums">{value}</p>
          <div className="text-xs text-ink-muted">{note}</div>
        </div>
        <div className="w-11 h-11 shrink-0 rounded-lg flex items-center justify-center bg-accent/10 text-accent">{icon}</div>
      </div>
    </div>
  );
}

function DailyBudgetCard({
  expenses,
  dailyBudget,
  onChange,
}: {
  expenses: Expense[];
  dailyBudget: number;
  onChange: (amount: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const suggestion = useMemo(() => suggestDailyBudget(expenses), [expenses]);

  const save = (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0) return;
    onChange(amount);
    setEditing(false);
  };

  return (
    <section className={CARD}>
      <h2 className="text-lg font-semibold text-ink mb-1">Daily budget</h2>
      <p className="text-sm text-ink-muted mb-4">A day counts toward your streak when you spend this much or less.</p>
      {editing ? (
        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
          <label htmlFor="daily-budget" className="text-sm text-ink-soft">
            $
          </label>
          <input
            id="daily-budget"
            type="number"
            inputMode="decimal"
            min="1"
            step="0.01"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            className="w-28 px-3 py-1.5 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button type="submit" className="px-4 py-1.5 bg-accent text-accent-ink rounded-full hover:bg-accent-strong transition-colors text-sm font-medium">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="px-2 py-1.5 text-sm text-ink-muted hover:text-ink">
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-3xl font-semibold text-ink tabular-nums">
            {formatCurrency(dailyBudget)}
            <span className="text-base font-normal text-ink-muted">/day</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setInput(String(dailyBudget));
              setEditing(true);
            }}
            className="text-sm text-accent hover:text-accent-strong"
          >
            Change
          </button>
        </div>
      )}
      {suggestion && suggestion.amount !== dailyBudget && !editing && (
        <p className="mt-4 text-sm text-ink-muted">
          <BulbIcon className="inline w-4 h-4 mr-1 -mt-0.5 text-accent" />
          Over your last {suggestion.basisDays} days, you stayed under {formatCurrency(suggestion.amount)}/day on{' '}
          {Math.round(suggestion.hitRate * 100)}% of days.{' '}
          <button type="button" onClick={() => onChange(suggestion.amount)} className="text-accent hover:text-accent-strong underline">
            Use {formatCurrency(suggestion.amount)}
          </button>
        </p>
      )}
    </section>
  );
}
