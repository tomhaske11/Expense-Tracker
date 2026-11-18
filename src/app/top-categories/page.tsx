'use client';

import { useState, useMemo } from 'react';
import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import { ExpenseCategory } from '@/features/expenses/types';
import { formatCurrency } from '@/lib/utils';
import { CATEGORY_COLORS } from '@/features/expenses/constants';
import CategoryIcon from '@/features/expenses/components/CategoryIcon';
import { DashboardIcon } from '@/lib/icons';
import { subDays, startOfMonth, startOfYear, parseISO, isWithinInterval } from 'date-fns';
import Link from 'next/link';
import AppHeader from '@/app/_components/AppHeader';

type DateFilter = 'last7days' | 'last30days' | 'thisMonth' | 'thisYear' | 'allTime';
type DisplayLimit = 5 | 10 | 'all';

interface CategoryStat {
  category: ExpenseCategory;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
  averageAmount: number;
}

export default function TopCategoriesPage() {
  const { expenses, isLoading } = useExpenses();
  const [dateFilter, setDateFilter] = useState<DateFilter>('allTime');
  const [displayLimit, setDisplayLimit] = useState<DisplayLimit>(10);

  const filteredExpenses = useMemo(() => {
    const now = new Date();

    switch (dateFilter) {
      case 'last7days':
        return expenses.filter(expense =>
          isWithinInterval(parseISO(expense.date), { start: subDays(now, 7), end: now })
        );
      case 'last30days':
        return expenses.filter(expense =>
          isWithinInterval(parseISO(expense.date), { start: subDays(now, 30), end: now })
        );
      case 'thisMonth':
        return expenses.filter(expense =>
          isWithinInterval(parseISO(expense.date), { start: startOfMonth(now), end: now })
        );
      case 'thisYear':
        return expenses.filter(expense =>
          isWithinInterval(parseISO(expense.date), { start: startOfYear(now), end: now })
        );
      case 'allTime':
      default:
        return expenses;
    }
  }, [expenses, dateFilter]);

  const categoryStats: CategoryStat[] = useMemo(() => {
    const categoryMap = new Map<ExpenseCategory, { total: number; count: number }>();

    filteredExpenses.forEach(expense => {
      const current = categoryMap.get(expense.category) || { total: 0, count: 0 };
      categoryMap.set(expense.category, {
        total: current.total + expense.amount,
        count: current.count + 1
      });
    });

    const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const stats: CategoryStat[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      totalAmount: data.total,
      percentage: totalSpent > 0 ? (data.total / totalSpent) * 100 : 0,
      transactionCount: data.count,
      averageAmount: data.total / data.count
    }));

    return stats.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredExpenses]);

  const displayedStats = useMemo(() => {
    if (displayLimit === 'all') return categoryStats;
    return categoryStats.slice(0, displayLimit);
  }, [categoryStats, displayLimit]);

  const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ink-muted">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <AppHeader />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-ink mb-2">Top Expense Categories</h2>
          <p className="text-ink-muted">Analyze your spending patterns by category</p>
        </div>

        {/* Filters */}
        <div className="bg-panel rounded-lg p-6 mb-6 border border-line">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              >
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="thisYear">This Year</option>
                <option value="allTime">All Time</option>
              </select>
            </div>

            {/* Display Limit Filter */}
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">
                Show Categories
              </label>
              <select
                value={displayLimit}
                onChange={(e) => setDisplayLimit(e.target.value === 'all' ? 'all' : parseInt(e.target.value) as DisplayLimit)}
                className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value="all">All Categories</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-panel border border-line border-l-2 border-l-accent rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-muted mb-2">Total Spending</p>
              <p className="text-3xl font-semibold text-ink">{formatCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-muted mb-2">Total Transactions</p>
              <p className="text-3xl font-semibold text-ink">{filteredExpenses.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-muted mb-2">Categories</p>
              <p className="text-3xl font-semibold text-ink">{categoryStats.length}</p>
            </div>
          </div>
        </div>

        {/* Category Stats */}
        {displayedStats.length > 0 ? (
          <div className="space-y-4">
            {displayedStats.map((stat, index) => (
              <div key={stat.category} className="bg-panel rounded-lg p-6 transition-shadow border border-line">
                <div className="flex items-start gap-4">
                  {/* Rank Badge */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full border flex items-center justify-center font-semibold text-lg ${
                    index === 0 ? 'bg-accent text-accent-ink border-accent' : index < 3 ? 'bg-accent/10 text-accent border-accent/40' : 'bg-panel-raised text-ink-muted border-line'
                  }`}>
                    #{index + 1}
                  </div>

                  {/* Category Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <CategoryIcon category={stat.category} className="w-7 h-7" />
                      <h3 className="text-xl font-semibold text-ink">{stat.category}</h3>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm text-ink-muted mb-1">
                        <span>Percentage of Total Spending</span>
                        <span className="font-medium">{stat.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-panel-raised rounded-full h-3">
                        <div
                          className="h-3 rounded-full transition-all duration-500"
                          style={{
                            width: `${stat.percentage}%`,
                            backgroundColor: CATEGORY_COLORS[stat.category]
                          }}
                        />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-canvas rounded-lg p-3">
                        <p className="text-xs text-ink-muted mb-1">Total Amount</p>
                        <p className="text-lg font-bold text-ink">{formatCurrency(stat.totalAmount)}</p>
                      </div>
                      <div className="bg-canvas rounded-lg p-3">
                        <p className="text-xs text-ink-muted mb-1">Transactions</p>
                        <p className="text-lg font-bold text-ink">{stat.transactionCount}</p>
                      </div>
                      <div className="bg-canvas rounded-lg p-3">
                        <p className="text-xs text-ink-muted mb-1">Average Amount</p>
                        <p className="text-lg font-bold text-ink">{formatCurrency(stat.averageAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-panel rounded-lg p-8 text-center border border-line">
            <DashboardIcon className="w-14 h-14 mx-auto mb-4 text-ink-faint" />
            <h3 className="text-xl font-semibold text-ink mb-2">No Data Available</h3>
            <p className="text-ink-muted mb-4">
              {expenses.length === 0
                ? "You haven't added any expenses yet. Start tracking your spending to see category insights!"
                : "No expenses found for the selected date range. Try adjusting your filters."}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-ink rounded-lg hover:bg-accent-strong transition-colors font-medium"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
