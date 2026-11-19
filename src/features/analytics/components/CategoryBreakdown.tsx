'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, type TooltipContentProps } from 'recharts';
import { Expense } from '@/features/expenses/types';
import { CATEGORY_COLORS } from '@/features/expenses/constants';
import CategoryIcon from '@/features/expenses/components/CategoryIcon';
import { calculateCategoryBreakdown } from '@/features/analytics/lib/stats';
import { CHART } from '@/lib/chartTheme';
import { formatCurrency } from '@/lib/utils';

interface CategoryBreakdownProps {
  /** Already filtered to the period being shown. */
  expenses: Expense[];
  /** Label in the middle of the donut, e.g. "This month". */
  centerLabel: string;
  /** Show each category's transaction count and average (the Spending page). */
  detailed?: boolean;
}

/** Donut + ranked list of spending per category. The one category view used across the app. */
export default function CategoryBreakdown({ expenses, centerLabel, detailed = false }: CategoryBreakdownProps) {
  const breakdown = useMemo(() => calculateCategoryBreakdown(expenses), [expenses]);
  const total = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const chartData = breakdown.map((item) => ({ name: item.category, value: item.amount, percentage: item.percentage }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="92%"
              paddingAngle={1}
              stroke={CHART.surface}
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name]} />
              ))}
            </Pie>
            <Tooltip content={SliceTooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs uppercase tracking-widest text-ink-muted">{centerLabel}</span>
          <span className="text-2xl font-semibold text-ink tabular-nums">{formatCurrency(total)}</span>
        </div>
      </div>

      <ul className="space-y-3">
        {breakdown.map((item) => (
          <li key={item.category} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium text-ink-soft">
                <CategoryIcon category={item.category} className="w-4 h-4" />
                {item.category}
              </span>
              <span className="font-semibold text-ink tabular-nums">{formatCurrency(item.amount)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-panel-raised rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${item.percentage}%`, backgroundColor: CATEGORY_COLORS[item.category] }}
                />
              </div>
              <span className="text-xs text-ink-muted w-12 text-right tabular-nums">{item.percentage.toFixed(1)}%</span>
            </div>
            {detailed && (
              <p className="text-xs text-ink-muted">
                {item.count} {item.count === 1 ? 'transaction' : 'transactions'} · {formatCurrency(item.average)} average
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SliceTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel-raised px-3 py-2 rounded-lg border border-line">
      <p className="font-medium text-ink">{payload[0].name}</p>
      <p className="text-sm text-ink-soft">
        {formatCurrency(Number(payload[0].value))} · {Number(payload[0].payload.percentage).toFixed(1)}%
      </p>
    </div>
  );
}
