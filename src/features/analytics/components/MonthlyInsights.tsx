'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Expense } from '@/features/expenses/types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/features/expenses/constants';
import { formatCurrency } from '@/lib/utils';
import { getCurrentMonthExpenses } from '@/features/expenses/lib/filters';
import { calculateBudgetStreak, calculateCategoryBreakdown } from '@/features/analytics/lib/stats';

interface MonthlyInsightsProps {
  expenses: Expense[];
  /** A day counts toward the streak when total spending that day is at or below this amount. */
  dailyBudget?: number;
  /** Streak length that fills the progress pill. */
  streakGoal?: number;
}

export default function MonthlyInsights({ expenses, dailyBudget = 50, streakGoal = 30 }: MonthlyInsightsProps) {
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
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 max-w-xl mx-auto">
      {/* Title */}
      <h2 className="text-3xl font-bold text-gray-900 text-center pb-4 mb-6 border-b-2 border-dashed border-gray-300">
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
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-semibold text-gray-500">Spending</span>
              <span className="text-xl font-bold text-gray-900">{formatCurrency(monthlyTotal)}</span>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <div className="text-5xl mb-2">🍩</div>
            <p>No spending recorded this month yet.</p>
          </div>
        )}
      </div>

      {/* Top 3 categories */}
      {topThree.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 text-right mb-2">
            Top {topThree.length}
          </p>
          <ul className="space-y-3">
            {topThree.map((item) => (
              <li
                key={item.category}
                className="flex items-center gap-3 border-l-4 pl-4 py-2"
                style={{ borderColor: CATEGORY_COLORS[item.category] }}
              >
                <span className="text-2xl" aria-hidden>
                  {CATEGORY_ICONS[item.category]}
                </span>
                <span className="text-lg text-gray-900">
                  {item.category}: <span className="font-semibold">{formatCurrency(item.amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Budget streak */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-center gap-6">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">Budget Streak</p>
          <p className="text-5xl font-bold text-green-600 my-1">{streak}</p>
          <p className="text-lg text-gray-700">{streak === 1 ? 'day!' : 'days!'}</p>
        </div>
        <div className="w-40">
          <div
            className="h-6 rounded-full bg-gray-100 border-2 border-gray-300 overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={streakGoal}
            aria-valuenow={Math.min(streak, streakGoal)}
            aria-label="Budget streak progress"
          >
            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${streakProgress}%` }} />
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">
            {Math.min(streak, streakGoal)}/{streakGoal} days under {formatCurrency(dailyBudget)}/day
          </p>
        </div>
      </div>
    </section>
  );
}
