'use client';

import { useState, useMemo } from 'react';
import { Expense, ExpenseCategory } from '@/features/expenses/types';
import { EXPENSE_CATEGORIES } from '@/features/expenses/constants';
import { filterExpenses } from '@/features/expenses/lib/filters';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ExportService, ExportFormat } from '@/features/export/lib/exportService';
import { format } from 'date-fns';
import { ChevronIcon, CloseIcon, DownloadIcon, FileIcon, ListIcon } from '@/lib/icons';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
}

export default function ExportModal({ isOpen, onClose, expenses }: ExportModalProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [filename, setFilename] = useState(`expenses-${format(new Date(), 'yyyy-MM-dd')}`);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<ExpenseCategory>>(
    new Set(EXPENSE_CATEGORIES)
  );
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filter expenses based on selections
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    // Apply date range filter
    if (startDate || endDate) {
      filtered = filterExpenses(filtered, {
        startDate: startDate || null,
        endDate: endDate || null,
        category: 'All',
        searchQuery: '',
      });
    }

    // Apply category filter
    filtered = filtered.filter((expense) => selectedCategories.has(expense.category));

    return filtered;
  }, [expenses, startDate, endDate, selectedCategories]);

  const totalAmount = useMemo(
    () => filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    [filteredExpenses]
  );

  const handleCategoryToggle = (category: ExpenseCategory) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category)) {
      newSelected.delete(category);
    } else {
      newSelected.add(category);
    }
    setSelectedCategories(newSelected);
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(new Set(EXPENSE_CATEGORIES));
  };

  const handleDeselectAllCategories = () => {
    setSelectedCategories(new Set());
  };

  const handleExport = async () => {
    if (filteredExpenses.length === 0) return;

    setIsExporting(true);
    try {
      const extension = exportFormat === 'csv' ? '.csv' : exportFormat === 'json' ? '.json' : '.pdf';
      const fullFilename = filename.endsWith(extension) ? filename : `${filename}${extension}`;

      await ExportService.export({
        format: exportFormat,
        expenses: filteredExpenses,
        filename: fullFilename,
      });

      // Close modal after successful export
      setTimeout(() => {
        onClose();
        resetState();
      }, 1000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const resetState = () => {
    setExportFormat('csv');
    setFilename(`expenses-${format(new Date(), 'yyyy-MM-dd')}`);
    setStartDate('');
    setEndDate('');
    setSelectedCategories(new Set(EXPENSE_CATEGORIES));
    setShowPreview(false);
  };

  const handleClose = () => {
    if (!isExporting) {
      onClose();
      resetState();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-panel rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-line">
          {/* Header */}
          <div className="sticky top-0 bg-panel border-b border-line px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-ink">Export Expenses</h2>
                <p className="text-sm text-ink-muted mt-1">
                  Configure and export your expense data
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isExporting}
                className="text-ink-faint hover:text-ink-muted transition-colors disabled:opacity-50"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Export Summary */}
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-accent font-medium">Records</p>
                  <p className="text-2xl font-bold text-accent-strong">{filteredExpenses.length}</p>
                </div>
                <div>
                  <p className="text-sm text-accent font-medium">Total Amount</p>
                  <p className="text-2xl font-bold text-accent-strong">{formatCurrency(totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-accent font-medium">Format</p>
                  <p className="text-2xl font-bold text-accent-strong uppercase">{exportFormat}</p>
                </div>
              </div>
            </div>

            {/* Export Format Selection */}
            <div>
              <label className="block text-sm font-semibold text-ink-soft mb-3">
                Export Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['csv', 'json', 'pdf'] as ExportFormat[]).map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      exportFormat === format
                        ? 'border-accent bg-accent/10 text-accent-strong'
                        : 'border-line hover:border-line text-ink-soft'
                    }`}
                  >
                    <div className="text-center">
                      <div className="flex justify-center mb-1 text-accent">
                        {format === 'csv' && <ListIcon className="w-6 h-6" />}
                        {format === 'json' && <span className="font-mono text-lg leading-6">{'{ }'}</span>}
                        {format === 'pdf' && <FileIcon className="w-6 h-6" />}
                      </div>
                      <p className="font-semibold uppercase">{format}</p>
                      <p className="text-xs text-ink-muted mt-1">
                        {format === 'csv' && 'Spreadsheet compatible'}
                        {format === 'json' && 'Developer friendly'}
                        {format === 'pdf' && 'Print ready'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filename */}
            <div>
              <label htmlFor="filename" className="block text-sm font-semibold text-ink-soft mb-2">
                Filename
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  id="filename"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="flex-1 px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Enter filename"
                />
                <span className="text-ink-muted font-mono text-sm">
                  .{exportFormat}
                </span>
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-semibold text-ink-soft mb-3">
                Date Range (Optional)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="start-date" className="block text-xs text-ink-muted mb-1">
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
                  <label htmlFor="end-date" className="block text-xs text-ink-muted mb-1">
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
            </div>

            {/* Category Filter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-ink-soft">
                  Categories
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAllCategories}
                    className="text-xs text-accent hover:text-accent font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-ink-faint">|</span>
                  <button
                    onClick={handleDeselectAllCategories}
                    className="text-xs text-ink-muted hover:text-ink-soft font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {EXPENSE_CATEGORIES.map((category) => (
                  <label
                    key={category}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedCategories.has(category)
                        ? 'border-accent bg-accent/10'
                        : 'border-line hover:border-line'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(category)}
                      onChange={() => handleCategoryToggle(category)}
                      className="w-4 h-4 accent-teal-400 rounded focus:ring-accent"
                    />
                    <span className="text-sm font-medium text-ink-soft">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview Toggle */}
            <div>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 text-accent hover:text-accent font-medium"
              >
                <ChevronIcon className={`w-5 h-5 transition-transform ${showPreview ? '' : '-rotate-90'}`} />
                {showPreview ? 'Hide' : 'Show'} Data Preview ({filteredExpenses.length} records)
              </button>
            </div>

            {/* Data Preview */}
            {showPreview && (
              <div className="border border-line rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-canvas sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-soft uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-soft uppercase">
                          Category
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-ink-soft uppercase">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-soft uppercase">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-ink-muted">
                            No expenses match the selected filters
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses.map((expense) => (
                          <tr key={expense.id} className="hover:bg-canvas">
                            <td className="px-4 py-3 text-sm text-ink">
                              {formatDate(expense.date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-ink-soft">
                              {expense.category}
                            </td>
                            <td className="px-4 py-3 text-sm text-ink text-right font-medium">
                              {formatCurrency(expense.amount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-ink-soft">
                              {expense.description}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-canvas border-t border-line px-6 py-4 rounded-b-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-muted">
                {filteredExpenses.length === 0
                  ? 'No data to export with current filters'
                  : `Ready to export ${filteredExpenses.length} expense${
                      filteredExpenses.length === 1 ? '' : 's'
                    }`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  disabled={isExporting}
                  className="px-6 py-2 border border-line rounded-lg text-ink-soft hover:bg-canvas transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={filteredExpenses.length === 0 || isExporting || !filename.trim()}
                  className="px-6 py-2 bg-accent text-accent-ink rounded-lg hover:bg-accent-strong transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-accent-ink border-t-transparent rounded-full animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="w-5 h-5" />
                      Export Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
