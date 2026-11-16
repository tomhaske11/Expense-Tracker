'use client';

import { useState, useMemo } from 'react';
import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import { ExpenseCategory } from '@/features/expenses/types';
import { formatCurrency } from '@/lib/utils';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/features/expenses/constants';
import { subDays, startOfMonth, startOfYear, parseISO, isWithinInterval } from 'date-fns';
import Link from 'next/link';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                  💸
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Expense Tracker</h1>
              </Link>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Top Expense Categories</h2>
          <p className="text-gray-600">Analyze your spending patterns by category</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Show Categories
              </label>
              <select
                value={displayLimit}
                onChange={(e) => setDisplayLimit(e.target.value === 'all' ? 'all' : parseInt(e.target.value) as DisplayLimit)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value="all">All Categories</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-sm p-6 mb-6 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total Spending</p>
              <p className="text-3xl font-bold">{formatCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm mb-1">Total Transactions</p>
              <p className="text-3xl font-bold">{filteredExpenses.length}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm mb-1">Categories</p>
              <p className="text-3xl font-bold">{categoryStats.length}</p>
            </div>
          </div>
        </div>

        {/* Category Stats */}
        {displayedStats.length > 0 ? (
          <div className="space-y-4">
            {displayedStats.map((stat, index) => (
              <div key={stat.category} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Rank Badge */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                  }`}>
                    #{index + 1}
                  </div>

                  {/* Category Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{CATEGORY_ICONS[stat.category]}</span>
                      <h3 className="text-xl font-semibold text-gray-900">{stat.category}</h3>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Percentage of Total Spending</span>
                        <span className="font-medium">{stat.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
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
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(stat.totalAmount)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Transactions</p>
                        <p className="text-lg font-bold text-gray-900">{stat.transactionCount}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Average Amount</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(stat.averageAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-500 mb-4">
              {expenses.length === 0
                ? "You haven't added any expenses yet. Start tracking your spending to see category insights!"
                : "No expenses found for the selected date range. Try adjusting your filters."}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
