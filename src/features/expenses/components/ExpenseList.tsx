'use client';

import { useState } from 'react';
import { Expense, ExpenseCategory } from '@/features/expenses/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { filterExpenses } from '@/features/expenses/lib/filters';
import { EXPENSE_CATEGORIES, CATEGORY_COLORS } from '@/features/expenses/constants';
import { format } from 'date-fns';
import CategoryIcon from '@/features/expenses/components/CategoryIcon';
import { EditIcon, TrashIcon } from '@/lib/icons';

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export default function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'All'>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filteredExpenses = filterExpenses(expenses, {
    startDate: startDate || null,
    endDate: endDate || null,
    category: categoryFilter,
    searchQuery,
  });

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = searchQuery || categoryFilter !== 'All' || startDate || endDate;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-panel rounded-lg p-4 space-y-4 border border-line">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-ink-soft mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label htmlFor="category-filter" className="block text-sm font-medium text-ink-soft mb-1">
              Category
            </label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'All')}
              className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="All">All Categories</option>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-ink-soft mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate || format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-ink-soft mb-1">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-line">
            <p className="text-sm text-ink-muted">
              Showing {filteredExpenses.length} of {expenses.length} expenses
            </p>
            <button
              onClick={clearFilters}
              className="text-sm text-accent hover:text-accent font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Expense List */}
      <div className="space-y-2">
        {filteredExpenses.length === 0 ? (
          <div className="bg-panel rounded-lg p-8 text-center border border-line">
            <p className="text-ink-muted">
              {expenses.length === 0
                ? 'No expenses yet. Add your first expense to get started!'
                : 'No expenses match your filters.'}
            </p>
          </div>
        ) : (
          filteredExpenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              onEdit={() => onEdit(expense)}
              onDelete={() => onDelete(expense.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ExpenseItemProps {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
}

function ExpenseItem({ expense, onEdit, onDelete }: ExpenseItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-panel rounded-lg p-4 transition-shadow border border-line">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${CATEGORY_COLORS[expense.category]}20` }}
          >
            <CategoryIcon category={expense.category} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-ink truncate">{expense.description}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-ink-muted">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium text-ink-soft"
                    style={{ backgroundColor: `${CATEGORY_COLORS[expense.category]}26` }}
                  >
                    {expense.category}
                  </span>
                  <span>•</span>
                  <span>{formatDate(expense.date)}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-lg text-ink">
                  {formatCurrency(expense.amount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-2 text-ink-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
            aria-label="Edit expense"
          >
            <EditIcon />
          </button>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-ink-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              aria-label="Delete expense"
            >
              <TrashIcon />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 bg-panel-raised text-ink-soft text-sm rounded-lg hover:bg-line transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
