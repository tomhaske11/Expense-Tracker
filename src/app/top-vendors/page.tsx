'use client';

import { useState, useMemo } from 'react';
import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import { DateRangeFilter } from '@/features/expenses/types';
import { formatCurrency } from '@/lib/utils';
import { filterExpensesByDateRange } from '@/features/expenses/lib/filters';
import { calculateVendorStats } from '@/features/analytics/lib/stats';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '@/features/expenses/constants';
import Link from 'next/link';

type VendorLimit = 5 | 10 | 20 | 'all';

const DATE_RANGE_LABELS: Record<DateRangeFilter, string> = {
  last7days: 'Last 7 Days',
  last30days: 'Last 30 Days',
  thisMonth: 'This Month',
  thisYear: 'This Year',
  allTime: 'All Time',
};

export default function TopVendorsPage() {
  const { expenses, isLoading } = useExpenses();
  const [dateRange, setDateRange] = useState<DateRangeFilter>('allTime');
  const [vendorLimit, setVendorLimit] = useState<VendorLimit>(10);

  const vendorStats = useMemo(() => {
    const filteredExpenses = filterExpensesByDateRange(expenses, dateRange);
    const stats = calculateVendorStats(filteredExpenses);

    if (vendorLimit === 'all') {
      return stats;
    }
    return stats.slice(0, vendorLimit);
  }, [expenses, dateRange, vendorLimit]);

  const totalSpending = useMemo(() => {
    const filteredExpenses = filterExpensesByDateRange(expenses, dateRange);
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses, dateRange]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vendor data...</p>
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
                className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white text-xl font-bold hover:opacity-90 transition-opacity"
              >
                💸
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Top Vendors</h1>
                <p className="text-sm text-gray-600">Analyze your spending by merchant</p>
              </div>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Show Top
              </label>
              <select
                value={vendorLimit}
                onChange={(e) =>
                  setVendorLimit(
                    e.target.value === 'all' ? 'all' : parseInt(e.target.value) as VendorLimit
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value="all">All Vendors</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-2xl">
                💰
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Spending</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpending)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-2xl">
                🏪
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Vendors</p>
                <p className="text-2xl font-bold text-gray-900">
                  {calculateVendorStats(filterExpensesByDateRange(expenses, dateRange)).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center text-2xl">
                🔝
              </div>
              <div>
                <p className="text-sm text-gray-600">Top Vendor</p>
                <p className="text-lg font-bold text-gray-900 truncate">
                  {vendorStats[0]?.vendor || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor List */}
        {vendorStats.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">🏪</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vendors Found</h3>
            <p className="text-gray-600">
              Add some expenses to see your top vendors and spending patterns.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Expenses
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {vendorStats.map((vendor, index) => (
              <VendorCard
                key={vendor.vendor}
                vendor={vendor}
                rank={index + 1}
                totalSpending={totalSpending}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

interface VendorCardProps {
  vendor: {
    vendor: string;
    totalAmount: number;
    percentage: number;
    transactionCount: number;
    averageAmount: number;
    topCategory: string;
    categoryBreakdown: Record<string, number>;
  };
  rank: number;
  totalSpending: number;
}

function VendorCard({ vendor, rank }: VendorCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const rankColors: Record<number, string> = {
    1: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    2: 'bg-gray-100 text-gray-700 border-gray-300',
    3: 'bg-orange-100 text-orange-700 border-orange-300',
  };

  const rankColor = rankColors[rank] ?? 'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Main Card Content */}
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Rank Badge */}
          <div
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-lg ${rankColor}`}
          >
            #{rank}
          </div>

          {/* Vendor Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {vendor.vendor}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-600">
                    {CATEGORY_ICONS[vendor.topCategory as keyof typeof CATEGORY_ICONS]}{' '}
                    {vendor.topCategory}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(vendor.totalAmount)}
                </p>
                <p className="text-sm text-gray-600">{vendor.percentage.toFixed(1)}% of total</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(vendor.percentage, 100)}%`,
                    backgroundColor:
                      CATEGORY_COLORS[vendor.topCategory as keyof typeof CATEGORY_COLORS],
                  }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-600">Transactions</p>
                <p className="text-sm font-semibold text-gray-900">
                  {vendor.transactionCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Average</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(vendor.averageAmount)}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  {isExpanded ? 'Hide' : 'Show'} Details
                  <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Category Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(vendor.categoryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}
                    </span>
                    <span className="text-sm text-gray-700">{category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${(amount / vendor.totalAmount) * 100}%`,
                          backgroundColor:
                            CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS],
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-20 text-right">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
