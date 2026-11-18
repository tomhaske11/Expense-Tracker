'use client';

import { FormEvent, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Expense } from '@/features/expenses/types';
import { CATEGORY_COLORS } from '@/features/expenses/constants';
import CategoryIcon from '@/features/expenses/components/CategoryIcon';
import { BulbIcon, PieIcon } from '@/lib/icons';
import { CHART } from '@/lib/chartTheme';
import { formatCurrency } from '@/lib/utils';
import { getCurrentMonthExpenses } from '@/features/expenses/lib/filters';
import { calculateBudgetStreak, calculateCategoryBreakdown, suggestDailyBudget } from '@/features/analytics/lib/stats';
import { useDailyBudget } from '@/features/analytics/hooks/useDailyBudget';
import BudgetCoach from '@/features/analytics/components/BudgetCoach';

interface MonthlyInsightsProps {
  expenses: Expense[];
  /** Streak length that fills the progress pill. */
  streakGoal?: number;
}

export default function MonthlyInsights({ expenses, streakGoal = 30 }: MonthlyInsightsProps) {
  // A day counts toward the streak when total spending that day is at or below this amount.
  const { dailyBudget, setDailyBudget } = useDailyBudget();
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const suggestion = useMemo(() => suggestDailyBudget(expenses), [expenses]);

  const saveBudget = (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(budgetInput);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setDailyBudget(amount);
    setEditingBudget(false);
  };

  const { breakdown, monthlyTotal } = useMemo(() => {
    const monthly = getCurrentMonthExpenses(expenses);
    return {
      breakdown: calculateCategoryBreakdown(monthly),
      monthlyTotal: monthly.reduce((sum, e) => sum + e.amount, 0),
    };
  }, [expenses]);

  const streak = useMemo(() => calculateBudgetStreak(expenses, dailyBudget), [expenses, dailyBudget]);

  const topThree = breakdown.slice(0, 3);
  const streakProgress = Math.min(streak / streakGoal, 1) * 100;
  const chartData = breakdown.map((item) => ({ name: item.category, value: item.amount }));

  return (
    <section className="bg-panel rounded-2xl border border-line p-6 sm:p-8 max-w-xl mx-auto">
      {/* Title */}
      <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-ink-muted text-center pb-4 mb-6 border-b border-line">
        Monthly Insights
      </h2>

      {/* Donut chart */}
      <div className="relative h-64 mb-6">
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="92%"
                  paddingAngle={1}
                  stroke={CHART.surface}
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} {...CHART.tooltip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-semibold text-ink-muted">Spending</span>
              <span className="text-xl font-bold text-ink">{formatCurrency(monthlyTotal)}</span>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-ink-muted">
            <PieIcon className="w-12 h-12 mb-3 text-ink-faint" />
            <p>No spending recorded this month yet.</p>
          </div>
        )}
      </div>

      {/* Top 3 categories */}
      {topThree.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted text-right mb-2">
            Top {topThree.length}
          </p>
          <ul className="space-y-3">
            {topThree.map((item) => (
              <li
                key={item.category}
                className="flex items-center gap-3 border-l-4 pl-4 py-2"
                style={{ borderColor: CATEGORY_COLORS[item.category] }}
              >
                <CategoryIcon category={item.category} className="w-6 h-6" />
                <span className="text-lg text-ink">
                  {item.category}: <span className="font-semibold">{formatCurrency(item.amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Budget streak */}
      <div className="border border-line bg-panel-raised/40 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-center gap-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">Budget streak</p>
          <p className="text-6xl font-light text-accent my-1 tabular-nums">{streak}</p>
          <p className="text-sm text-ink-soft">{streak === 1 ? 'day' : 'days'}</p>
        </div>
        <div className="w-40">
          <div
            className="h-2 rounded-full bg-line overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={streakGoal}
            aria-valuenow={Math.min(streak, streakGoal)}
            aria-label="Budget streak progress"
          >
            <div className="h-full bg-accent transition-all duration-500" style={{ width: `${streakProgress}%` }} />
          </div>
          <p className="text-xs text-ink-muted text-center mt-1">
            {Math.min(streak, streakGoal)}/{streakGoal} days under {formatCurrency(dailyBudget)}/day
          </p>
        </div>
      </div>

      {/* Daily budget */}
      <div className="mt-3 text-sm text-ink-soft text-center space-y-2">
        {editingBudget ? (
          <form onSubmit={saveBudget} className="flex items-center justify-center gap-2">
            <label htmlFor="daily-budget">Daily budget $</label>
            <input
              id="daily-budget"
              type="number"
              inputMode="decimal"
              min="1"
              step="0.01"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              autoFocus
              className="w-24 px-2 py-1 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button type="submit" className="px-3 py-1 bg-accent text-accent-ink rounded-lg hover:bg-accent-strong transition-colors">
              Save
            </button>
            <button type="button" onClick={() => setEditingBudget(false)} className="px-2 py-1 text-ink-muted hover:text-ink">
              Cancel
            </button>
          </form>
        ) : (
          <p>
            Daily budget: <span className="font-semibold">{formatCurrency(dailyBudget)}</span>{' '}
            <button
              type="button"
              onClick={() => {
                setBudgetInput(String(dailyBudget));
                setEditingBudget(true);
              }}
              className="text-accent hover:text-accent-strong underline"
            >
              Change
            </button>
          </p>
        )}
        {suggestion && suggestion.amount !== dailyBudget && !editingBudget && (
          <p className="text-ink-muted">
            <BulbIcon className="inline w-4 h-4 mr-1 -mt-0.5 text-accent" />Based on your last {suggestion.basisDays} days, {formatCurrency(suggestion.amount)}/day is one you met on{' '}
            {Math.round(suggestion.hitRate * 100)}% of days.{' '}
            <button
              type="button"
              onClick={() => setDailyBudget(suggestion.amount)}
              className="text-accent hover:text-accent-strong underline"
            >
              Use {formatCurrency(suggestion.amount)}
            </button>
          </p>
        )}
      </div>

      <BudgetCoach expenses={expenses} dailyBudget={dailyBudget} />
    </section>
  );
}
