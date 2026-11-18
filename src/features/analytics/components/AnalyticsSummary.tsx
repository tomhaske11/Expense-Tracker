'use client';

import { AnalyticsSummary as AnalyticsSummaryType } from '@/features/analytics/types';
import { formatCurrency } from '@/lib/utils';
import { CATEGORY_ICONS } from '@/features/expenses/constants';

interface AnalyticsSummaryProps {
  summary: AnalyticsSummaryType;
}

export default function AnalyticsSummary({ summary }: AnalyticsSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Spending Card */}
      <MetricCard
        title="Total Spending"
        value={formatCurrency(summary.totalSpending)}
        subtitle={`${summary.totalTransactions} transactions`}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
        color="blue"
      />

      {/* Average Transaction Card */}
      <MetricCard
        title="Average Transaction"
        value={formatCurrency(summary.averageTransaction)}
        subtitle="Per expense"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        }
        color="purple"
      />

      {/* Current Month Card */}
      <MetricCard
        title="This Month"
        value={formatCurrency(summary.currentMonthSpending)}
        subtitle={
          summary.monthOverMonthChange !== 0 ? (
            <span
              className={`inline-flex items-center gap-1 ${
                summary.monthOverMonthChange > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {summary.monthOverMonthChange > 0 ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {Math.abs(summary.monthOverMonthChange).toFixed(1)}% vs last month
            </span>
          ) : (
            'No change from last month'
          )
        }
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        }
        color="green"
      />

      {/* Top Category Card */}
      <MetricCard
        title="Top Category"
        value={summary.topCategory ? summary.topCategory.category : 'N/A'}
        subtitle={
          summary.topCategory
            ? `${formatCurrency(summary.topCategory.amount)} (${summary.topCategory.percentage.toFixed(1)}%)`
            : 'No data'
        }
        icon={
          summary.topCategory ? (
            <span className="text-2xl">{CATEGORY_ICONS[summary.topCategory.category]}</span>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          )
        }
        color="orange"
      />
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: React.ReactNode;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function MetricCard({ title, value, subtitle, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-1 break-words">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ml-2 ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
