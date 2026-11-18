'use client';

import { useState, useMemo } from 'react';
import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import { AnalyticsFilters } from '@/features/analytics/types';
import { calculateAnalyticsSummary } from '@/features/analytics/lib/trends';
import AnalyticsSummary from '@/features/analytics/components/AnalyticsSummary';
import DateRangeFilter from '@/features/analytics/components/DateRangeFilter';
import TrendChart from '@/features/analytics/components/TrendChart';
import MonthlyComparisonChart from '@/features/analytics/components/MonthlyComparisonChart';
import CategoryChart from '@/features/analytics/components/CategoryChart';
import Link from 'next/link';

export default function AnalyticsPage() {
  const { expenses, isLoading } = useExpenses();
  const [filters, setFilters] = useState<AnalyticsFilters>({
    startDate: null,
    endDate: null,
    category: 'All',
  });

  // Calculate analytics summary based on current filters
  const analytics = useMemo(() => {
    return calculateAnalyticsSummary(expenses, filters);
  }, [expenses, filters]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
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
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Expense Tracker</h1>
                  <p className="text-xs text-gray-600">Analytics Dashboard</p>
                </div>
              </Link>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {expenses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Yet</h2>
              <p className="text-gray-600 mb-6">
                Start tracking your expenses to see analytics and insights about your spending
                habits.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Your First Expense
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <DateRangeFilter filters={filters} onFiltersChange={setFilters} />

            {/* Summary Cards */}
            <AnalyticsSummary summary={analytics} />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trend Chart */}
              <TrendChart dailyData={analytics.dailyTrend} weeklyData={analytics.weeklyTrend} />

              {/* Category Chart */}
              <CategoryChart categoryData={analytics.categoryBreakdown} />
            </div>

            {/* Monthly Comparison Chart */}
            {analytics.monthlyTrend.length > 0 && (
              <MonthlyComparisonChart monthlyData={analytics.monthlyTrend} />
            )}

            {/* Insights Section */}
            {analytics.categoryBreakdown.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Insights & Recommendations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Spending Pattern Insight */}
                  <InsightCard
                    icon={
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                    }
                    title="Spending Pattern"
                    description={
                      analytics.monthOverMonthChange > 0
                        ? `Your spending increased by ${Math.abs(analytics.monthOverMonthChange).toFixed(1)}% this month. Consider reviewing your budget.`
                        : analytics.monthOverMonthChange < 0
                        ? `Great job! You reduced spending by ${Math.abs(analytics.monthOverMonthChange).toFixed(1)}% this month.`
                        : 'Your spending remained stable this month.'
                    }
                    color={analytics.monthOverMonthChange > 0 ? 'red' : 'green'}
                  />

                  {/* Top Category Insight */}
                  {analytics.topCategory && (
                    <InsightCard
                      icon={
                        <svg
                          className="w-5 h-5 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                      }
                      title="Top Spending Category"
                      description={`${analytics.topCategory.category} accounts for ${analytics.topCategory.percentage.toFixed(1)}% of your total spending with an average of ${
                        analytics.topCategory.averageAmount.toFixed(2)
                      } per transaction.`}
                      color="purple"
                    />
                  )}

                  {/* Transaction Frequency Insight */}
                  <InsightCard
                    icon={
                      <svg
                        className="w-5 h-5 text-orange-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    }
                    title="Transaction Frequency"
                    description={`You've made ${analytics.totalTransactions} transactions with an average of ${analytics.averageTransaction.toFixed(2)} per transaction.`}
                    color="orange"
                  />

                  {/* Data Range Insight */}
                  {analytics.dateRange.earliest && analytics.dateRange.latest && (
                    <InsightCard
                      icon={
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      }
                      title="Tracking Period"
                      description={`Tracking expenses from ${new Date(analytics.dateRange.earliest).toLocaleDateString()} to ${new Date(analytics.dateRange.latest).toLocaleDateString()}.`}
                      color="green"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

interface InsightCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

function InsightCard({ icon, title, description, color }: InsightCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200',
    red: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-700">{description}</p>
        </div>
      </div>
    </div>
  );
}
