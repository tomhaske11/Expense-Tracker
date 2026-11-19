'use client';

import { useState } from 'react';
import { ExpenseCategory } from '@/features/expenses/types';
import { CATEGORY_COLORS } from '@/features/expenses/constants';
import CategoryIcon from '@/features/expenses/components/CategoryIcon';
import { VendorStats } from '@/features/analytics/types';
import { formatCurrency } from '@/lib/utils';
import { ChevronIcon } from '@/lib/icons';

/** One ranked vendor on the Spending page, expandable to its category split. */
interface VendorCardProps {
  vendor: VendorStats;
  rank: number;
}

export default function VendorCard({ vendor, rank }: VendorCardProps) {
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
                    <CategoryIcon category={vendor.topCategory} className="inline w-4 h-4 -mt-0.5" />{' '}
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
                      CATEGORY_COLORS[vendor.topCategory],
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
                            CATEGORY_COLORS[category as ExpenseCategory],
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
