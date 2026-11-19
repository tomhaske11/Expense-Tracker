'use client';

import { ReactNode, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { DateRangeFilter, Expense } from '@/features/expenses/types';
import { filterExpensesByDateRange } from '@/features/expenses/lib/filters';
import { calculateMonthlyTotals, calculateVendorStats, summarize } from '@/features/analytics/lib/stats';
import CategoryBreakdown from '@/features/analytics/components/CategoryBreakdown';
import VendorCard from '@/features/analytics/components/VendorCard';
import { CHART } from '@/lib/chartTheme';
import { formatCurrency } from '@/lib/utils';
import { CalendarIcon, PieIcon, StoreIcon } from '@/lib/icons';

export type SpendingView = 'category' | 'vendor' | 'month';

const VIEWS: { value: SpendingView; label: string; icon: ReactNode }[] = [
  { value: 'category', label: 'Category', icon: <PieIcon className="w-4 h-4" /> },
  { value: 'vendor', label: 'Vendor', icon: <StoreIcon className="w-4 h-4" /> },
  { value: 'month', label: 'Month', icon: <CalendarIcon className="w-4 h-4" /> },
];

const RANGES: Record<DateRangeFilter, string> = {
  thisMonth: 'This month',
  last30days: 'Last 30 days',
  thisYear: 'This year',
  allTime: 'All time',
  last7days: 'Last 7 days',
};

const RANGE_ORDER: DateRangeFilter[] = ['last7days', 'last30days', 'thisMonth', 'thisYear', 'allTime'];

type VendorLimit = 10 | 20 | 'all';

interface SpendingExplorerProps {
  expenses: Expense[];
  view: SpendingView;
  onViewChange: (view: SpendingView) => void;
}

/** Spending over a chosen period, broken down one way at a time: category, vendor or month. */
export default function SpendingExplorer({ expenses, view, onViewChange }: SpendingExplorerProps) {
  const [range, setRange] = useState<DateRangeFilter>('thisYear');
  const [vendorLimit, setVendorLimit] = useState<VendorLimit>(10);

  const inRange = useMemo(() => filterExpensesByDateRange(expenses, range), [expenses, range]);
  const totals = useMemo(() => summarize(inRange), [inRange]);
  const vendors = useMemo(() => (view === 'vendor' ? calculateVendorStats(inRange) : []), [inRange, view]);
  const months = useMemo(
    () =>
      view === 'month'
        ? calculateMonthlyTotals(inRange).map((m) => ({ ...m, label: format(parseISO(`${m.month}-01`), 'MMM yyyy') }))
        : [],
    [inRange, view],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div role="tablist" aria-label="Break down by" className="grid grid-cols-3 sm:inline-flex p-1 bg-panel border border-line rounded-full">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={view === v.value}
              onClick={() => onViewChange(v.value)}
              className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                view === v.value ? 'bg-accent text-accent-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {v.icon}
              {v.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          Period
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as DateRangeFilter)}
            className="px-3 py-2 border border-line rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {RANGE_ORDER.map((r) => (
              <option key={r} value={r}>
                {RANGES[r]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Stat label="Total" value={formatCurrency(totals.total)} />
        <Stat label="Transactions" value={String(totals.count)} />
        <Stat label="Average" value={formatCurrency(totals.average)} />
      </div>

      {inRange.length === 0 ? (
        <div className="bg-panel border border-line rounded-lg p-8 text-center">
          <p className="text-ink font-medium mb-1">Nothing in {RANGES[range].toLowerCase()}</p>
          <p className="text-ink-muted mb-4">Pick a longer period to see your spending.</p>
          <button
            type="button"
            onClick={() => setRange('allTime')}
            className="px-4 py-2 rounded-full border border-accent text-accent text-sm font-medium hover:bg-accent/10"
          >
            Show all time
          </button>
        </div>
      ) : view === 'category' ? (
        <section className="bg-panel border border-line rounded-lg p-6">
          <CategoryBreakdown expenses={inRange} centerLabel={RANGES[range]} detailed />
        </section>
      ) : view === 'vendor' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">
              {vendors.length} {vendors.length === 1 ? 'vendor' : 'vendors'}
            </p>
            <select
              aria-label="How many vendors"
              value={vendorLimit}
              onChange={(e) => setVendorLimit(e.target.value === 'all' ? 'all' : (Number(e.target.value) as VendorLimit))}
              className="px-3 py-2 border border-line rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value="all">All vendors</option>
            </select>
          </div>
          {(vendorLimit === 'all' ? vendors : vendors.slice(0, vendorLimit)).map((v, i) => (
            <VendorCard key={v.vendor} vendor={v} rank={i + 1} />
          ))}
        </div>
      ) : (
        <section className="bg-panel border border-line rounded-lg p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">Spending per month</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v: number) => formatCurrency(v).replace(/\.00$/, '')}
                  tick={{ fill: CHART.axis, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
                <Tooltip content={MonthTooltip} cursor={CHART.tooltip.cursor} />
                <Bar dataKey="total" fill={CHART.accent} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="w-full mt-6 text-sm">
            <thead>
              <tr className="text-left text-ink-muted border-b border-line">
                <th className="py-2 font-medium">Month</th>
                <th className="py-2 font-medium text-right">Transactions</th>
                <th className="py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...months].reverse().map((m) => (
                <tr key={m.month} className="border-b border-line last:border-0">
                  <td className="py-2 text-ink-soft">{m.label}</td>
                  <td className="py-2 text-right text-ink-muted tabular-nums">{m.count}</td>
                  <td className="py-2 text-right text-ink font-medium tabular-nums">{formatCurrency(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel border border-line rounded-lg p-3 sm:p-6 min-w-0">
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide sm:tracking-widest text-ink-muted mb-1">{label}</p>
      <p className="text-base sm:text-2xl font-semibold text-ink tabular-nums">{value}</p>
    </div>
  );
}

function MonthTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload as { label: string; total: number; count: number };
  return (
    <div className="bg-panel-raised px-3 py-2 rounded-lg border border-line">
      <p className="font-medium text-ink">{m.label}</p>
      <p className="text-sm text-ink-soft">
        {formatCurrency(m.total)} · {m.count} transactions
      </p>
    </div>
  );
}
