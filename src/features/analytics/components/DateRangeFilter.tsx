'use client';

import { useState, useEffect } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { ExpenseCategory } from '@/features/expenses/types';
import { AnalyticsFilters } from '@/features/analytics/types';
import { EXPENSE_CATEGORIES } from '@/features/expenses/constants';

interface DateRangeFilterProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
}

type QuickRange = 'all' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

export default function DateRangeFilter({ filters, onFiltersChange }: DateRangeFilterProps) {
  const [quickRange, setQuickRange] = useState<QuickRange>('all');
  const [showCustom, setShowCustom] = useState(false);

  // Handle quick range selection
  const handleQuickRangeChange = (range: QuickRange) => {
    setQuickRange(range);

    const today = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null;

    switch (range) {
      case 'all':
        startDate = null;
        endDate = null;
        setShowCustom(false);
        break;
      case 'last7':
        startDate = format(subDays(today, 7), 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
        setShowCustom(false);
        break;
      case 'last30':
        startDate = format(subDays(today, 30), 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
        setShowCustom(false);
        break;
      case 'thisMonth':
        startDate = format(startOfMonth(today), 'yyyy-MM-dd');
        endDate = format(endOfMonth(today), 'yyyy-MM-dd');
        setShowCustom(false);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        startDate = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        endDate = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        setShowCustom(false);
        break;
      case 'thisYear':
        startDate = format(startOfYear(today), 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
        setShowCustom(false);
        break;
      case 'custom':
        setShowCustom(true);
        return; // Don't update filters yet
    }

    onFiltersChange({
      ...filters,
      startDate,
      endDate,
    });
  };

  // Handle custom date change
  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value || null,
    });
  };

  // Handle category change
  const handleCategoryChange = (category: ExpenseCategory | 'All') => {
    onFiltersChange({
      ...filters,
      category,
    });
  };

  // Handle reset
  const handleReset = () => {
    setQuickRange('all');
    setShowCustom(false);
    onFiltersChange({
      startDate: null,
      endDate: null,
      category: 'All',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        <button
          onClick={handleReset}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Reset All
        </button>
      </div>

      {/* Quick Date Range Buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <QuickRangeButton
            active={quickRange === 'all'}
            onClick={() => handleQuickRangeChange('all')}
          >
            All Time
          </QuickRangeButton>
          <QuickRangeButton
            active={quickRange === 'last7'}
            onClick={() => handleQuickRangeChange('last7')}
          >
            Last 7 Days
          </QuickRangeButton>
          <QuickRangeButton
            active={quickRange === 'last30'}
            onClick={() => handleQuickRangeChange('last30')}
          >
            Last 30 Days
          </QuickRangeButton>
          <QuickRangeButton
            active={quickRange === 'thisMonth'}
            onClick={() => handleQuickRangeChange('thisMonth')}
          >
            This Month
          </QuickRangeButton>
          <QuickRangeButton
            active={quickRange === 'lastMonth'}
            onClick={() => handleQuickRangeChange('lastMonth')}
          >
            Last Month
          </QuickRangeButton>
          <QuickRangeButton
            active={quickRange === 'thisYear'}
            onClick={() => handleQuickRangeChange('thisYear')}
          >
            This Year
          </QuickRangeButton>
          <QuickRangeButton
            active={quickRange === 'custom'}
            onClick={() => handleQuickRangeChange('custom')}
          >
            Custom
          </QuickRangeButton>
        </div>
      </div>

      {/* Custom Date Range Inputs */}
      {showCustom && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={filters.startDate || ''}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={filters.endDate || ''}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <CategoryButton
            active={filters.category === 'All'}
            onClick={() => handleCategoryChange('All')}
          >
            All Categories
          </CategoryButton>
          {EXPENSE_CATEGORIES.map((category) => (
            <CategoryButton
              key={category}
              active={filters.category === category}
              onClick={() => handleCategoryChange(category)}
            >
              {category}
            </CategoryButton>
          ))}
        </div>
      </div>

      {/* Active Filters Display */}
      {(filters.startDate || filters.endDate || filters.category !== 'All') && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-500 mb-2">Active Filters:</p>
          <div className="flex flex-wrap gap-2">
            {filters.startDate && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                From: {format(new Date(filters.startDate), 'MMM dd, yyyy')}
              </span>
            )}
            {filters.endDate && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                To: {format(new Date(filters.endDate), 'MMM dd, yyyy')}
              </span>
            )}
            {filters.category !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                Category: {filters.category}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface QuickRangeButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function QuickRangeButton({ active, onClick, children }: QuickRangeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

interface CategoryButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function CategoryButton({ active, onClick, children }: CategoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-purple-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
