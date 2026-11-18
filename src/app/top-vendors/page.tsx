'use client';

import { useState, useMemo } from 'react';
import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import { DateRangeFilter } from '@/features/expenses/types';
import { formatCurrency } from '@/lib/utils';
import { filterExpensesByDateRange } from '@/features/expenses/lib/filters';
import { calculateVendorStats } from '@/features/analytics/lib/stats';
import { CATEGORY_COLORS } from '@/features/expenses/constants';
import { ExpenseCategory } from '@/features/expenses/types';
import Link from 'next/link';
import AppHeader from '@/app/_components/AppHeader';
import CategoryIcon from '@/features/expenses/components/CategoryIcon';
import { ChevronIcon, StoreIcon, TrophyIcon, WalletIcon } from '@/lib/icons';

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
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ink-muted">Loading vendor data...</p>
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
        {/* Filters */}
        <div className="bg-panel rounded-lg p-6 mb-6 border border-line">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-ink-soft mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
                className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              >
                {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-ink-soft mb-2">
                Show Top
              </label>
              <select
                value={vendorLimit}
                onChange={(e) =>
                  setVendorLimit(
                    e.target.value === 'all' ? 'all' : parseInt(e.target.value) as VendorLimit
                  )
                }
                className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
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
          <div className="bg-panel rounded-lg p-6 border border-line">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                <WalletIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-ink-muted">Total Spending</p>
                <p className="text-2xl font-bold text-ink">{formatCurrency(totalSpending)}</p>
              </div>
            </div>
          </div>
          <div className="bg-panel rounded-lg p-6 border border-line">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                <StoreIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-ink-muted">Total Vendors</p>
                <p className="text-2xl font-bold text-ink">
                  {calculateVendorStats(filterExpensesByDateRange(expenses, dateRange)).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-panel rounded-lg p-6 border border-line">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                <TrophyIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-ink-muted">Top Vendor</p>
                <p className="text-lg font-bold text-ink truncate">
                  {vendorStats[0]?.vendor || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor List */}
        {vendorStats.length === 0 ? (
          <div className="bg-panel rounded-lg p-8 text-center border border-line">
            <StoreIcon className="w-14 h-14 mx-auto mb-4 text-ink-faint" />
            <h3 className="text-lg font-semibold text-ink mb-2">No Vendors Found</h3>
            <p className="text-ink-muted">
              Add some expenses to see your top vendors and spending patterns.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 px-4 py-2 bg-accent text-accent-ink rounded-lg hover:bg-accent-strong transition-colors"
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
    1: 'bg-accent text-accent-ink border-accent',
    2: 'bg-accent/10 text-accent border-accent/40',
    3: 'bg-accent/10 text-accent border-accent/40',
  };

  const rankColor = rankColors[rank] ?? 'bg-panel-raised text-ink-muted border-line';

  return (
    <div className="bg-panel rounded-lg border border-line overflow-hidden">
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
                <h3 className="text-lg font-semibold text-ink truncate">
                  {vendor.vendor}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-ink-muted">
                    <CategoryIcon category={vendor.topCategory as ExpenseCategory} className="inline w-4 h-4 -mt-0.5" />{' '}
                    {vendor.topCategory}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-ink">
                  {formatCurrency(vendor.totalAmount)}
                </p>
                <p className="text-sm text-ink-muted">{vendor.percentage.toFixed(1)}% of total</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="w-full bg-panel-raised rounded-full h-2">
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
                <p className="text-xs text-ink-muted">Transactions</p>
                <p className="text-sm font-semibold text-ink">
                  {vendor.transactionCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Average</p>
                <p className="text-sm font-semibold text-ink">
                  {formatCurrency(vendor.averageAmount)}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-accent hover:text-accent-strong font-medium flex items-center gap-1"
                >
                  {isExpanded ? 'Hide' : 'Show'} Details
                  <span className={`inline-block transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden>
                    <ChevronIcon className="w-4 h-4" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-line bg-canvas p-6">
          <h4 className="text-sm font-semibold text-ink mb-3">Category Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(vendor.categoryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon category={category as ExpenseCategory} className="w-4 h-4" />
                    <span className="text-sm text-ink-soft">{category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-panel-raised rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${(amount / vendor.totalAmount) * 100}%`,
                          backgroundColor:
                            CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS],
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-ink w-20 text-right">
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
