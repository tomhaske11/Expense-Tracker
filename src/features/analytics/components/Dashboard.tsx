'use client';

import { ReactNode, useMemo, useState } from 'react';
import { Expense } from '@/features/expenses/types';
import { formatCurrency } from '@/lib/utils';
import { getCurrentMonthExpenses } from '@/features/expenses/lib/filters';
import { calculateCategoryBreakdown } from '@/features/analytics/lib/stats';
import { CATEGORY_COLORS } from '@/features/expenses/constants';
import CategoryIcon from '@/features/expenses/components/CategoryIcon';
import { BoxIcon, CalendarIcon, DownloadIcon, TrendIcon, WalletIcon } from '@/lib/icons';
import { CHART } from '@/lib/chartTheme';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  type PieLabelRenderProps,
  type TooltipContentProps,
} from 'recharts';
import ExportModal from '@/features/export/components/ExportModal';

interface DashboardProps {
  expenses: Expense[];
}

export default function Dashboard({ expenses }: DashboardProps) {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const summary = useMemo(() => {
    const totalSpending = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const monthlyExpenses = getCurrentMonthExpenses(expenses);
    const monthlySpending = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const categoryBreakdown = calculateCategoryBreakdown(expenses);

    return {
      totalSpending,
      monthlySpending,
      categoryBreakdown,
      expenseCount: expenses.length,
      monthlyExpenseCount: monthlyExpenses.length,
    };
  }, [expenses]);

  const chartData = summary.categoryBreakdown.map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage,
  }));

  const topCategory = summary.categoryBreakdown[0];
  const averageExpense = summary.expenseCount > 0 ? summary.totalSpending / summary.expenseCount : 0;

  return (
    <>
      <div className="space-y-6">
        {/* Export banner */}
        {expenses.length > 0 && (
          <div className="bg-panel border border-line rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-ink mb-1">Export your data</h3>
              <p className="text-ink-muted text-sm">CSV, JSON or PDF, with filters and a preview.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="px-5 py-2.5 bg-accent text-accent-ink rounded-full hover:bg-accent-strong transition-colors font-medium flex items-center justify-center gap-2"
            >
              <DownloadIcon />
              Export data
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Spending"
          value={formatCurrency(summary.totalSpending)}
          icon={<WalletIcon className="w-6 h-6" />}
          subtitle={`${summary.expenseCount} expenses`}
        />
        <SummaryCard
          title="This Month"
          value={formatCurrency(summary.monthlySpending)}
          icon={<CalendarIcon className="w-6 h-6" />}
          subtitle={`${summary.monthlyExpenseCount} expenses`}
        />
        <SummaryCard
          title="Average Expense"
          value={formatCurrency(averageExpense)}
          icon={<TrendIcon className="w-6 h-6" />}
          subtitle="Per transaction"
        />
        <SummaryCard
          title="Top Category"
          value={topCategory?.category || 'N/A'}
          icon={topCategory ? <CategoryIcon category={topCategory.category} className="w-6 h-6" colored={false} /> : <BoxIcon className="w-6 h-6" />}
          subtitle={topCategory ? formatCurrency(topCategory.amount) : 'No data'}
        />
      </div>

      {/* Charts */}
      {summary.categoryBreakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-panel rounded-lg p-6 border border-line">
            <h2 className="text-lg font-semibold text-ink mb-4">Spending by Category</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    dataKey="value"
                    stroke={CHART.surface}
                    strokeWidth={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip content={CustomTooltip} />
                  <Legend formatter={(value) => <span style={{ color: CHART.text }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown List */}
          <div className="bg-panel rounded-lg p-6 border border-line">
            <h2 className="text-lg font-semibold text-ink mb-4">Category Breakdown</h2>
            <div className="space-y-3">
              {summary.categoryBreakdown.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={item.category} className="w-4 h-4" />
                      <span className="font-medium text-ink-soft">{item.category}</span>
                    </div>
                    <span className="font-semibold text-ink">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-panel-raised rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: CATEGORY_COLORS[item.category],
                        }}
                      />
                    </div>
                    <span className="text-xs text-ink-muted w-12 text-right">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

        {summary.categoryBreakdown.length === 0 && (
          <div className="bg-panel rounded-lg p-8 text-center border border-line">
            <p className="text-ink-muted">No expenses to display. Add some expenses to see your spending breakdown!</p>
          </div>
        )}
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        expenses={expenses}
      />
    </>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  subtitle: string;
}

function SummaryCard({ title, value, icon, subtitle }: SummaryCardProps) {
  return (
    <div className="bg-panel rounded-lg p-6 border border-line">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-widest text-ink-muted mb-2">{title}</p>
          <p className="text-2xl font-semibold text-ink mb-1">{value}</p>
          <p className="text-xs text-ink-muted">{subtitle}</p>
        </div>
        <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-accent/10 text-accent">{icon}</div>
      </div>
    </div>
  );
}

function renderCustomLabel({ cx, cy, midAngle = 0, innerRadius, outerRadius, percent = 0 }: PieLabelRenderProps) {
  const percentage = percent * 100;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percentage < 5) return null;

  return (
    <text
      x={x}
      y={y}
      fill={CHART.onSlice}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      {`${percentage.toFixed(0)}%`}
    </text>
  );
}

function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-panel px-4 py-2 rounded-lg shadow-lg border border-line">
        <p className="font-medium text-ink">{payload[0].name}</p>
        <p className="text-sm text-ink-muted">{formatCurrency(Number(payload[0].value))}</p>
        <p className="text-xs text-ink-muted">{payload[0].payload.percentage.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
}
