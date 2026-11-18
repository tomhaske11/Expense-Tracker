'use client';

import { useState } from 'react';
import { ExpenseFormData, ExpenseCategory, Expense } from '@/features/expenses/types';
import { EXPENSE_CATEGORIES } from '@/features/expenses/constants';
import { format } from 'date-fns';
import QuickAddInput from '@/features/expenses/components/QuickAddInput';
import type { ParsedExpense } from '@/features/expenses/lib/quickAdd';

interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormData) => void;
  onCancel?: () => void;
  initialData?: Expense;
  submitLabel?: string;
}

export default function ExpenseForm({
  onSubmit,
  onCancel,
  initialData,
  submitLabel = 'Add Expense',
}: ExpenseFormProps) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    date: initialData?.date || format(new Date(), 'yyyy-MM-dd'),
    amount: initialData?.amount.toString() || '',
    category: initialData?.category || 'Food',
    description: initialData?.description || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ExpenseFormData, string>> = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (formData.amount && !/^\d+\.?\d{0,2}$/.test(formData.amount)) {
      newErrors.amount = 'Invalid amount format';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
      if (!initialData) {
        // Reset form only if adding new expense
        setFormData({
          date: format(new Date(), 'yyyy-MM-dd'),
          amount: '',
          category: 'Food',
          description: '',
        });
        setErrors({});
      }
    }
  };

  const handleChange = (
    field: keyof ExpenseFormData,
    value: string | ExpenseCategory
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleQuickAdd = (parsed: ParsedExpense) => {
    setFormData((prev) => ({
      date: parsed.date,
      amount: parsed.amount !== null ? parsed.amount.toFixed(2) : prev.amount,
      category: parsed.category,
      description: parsed.description || prev.description,
    }));
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initialData && <QuickAddInput onParsed={handleQuickAdd} />}

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-ink-soft mb-1">
          Date
        </label>
        <input
          type="date"
          id="date"
          value={formData.date}
          onChange={(e) => handleChange('date', e.target.value)}
          max={format(new Date(), 'yyyy-MM-dd')}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent ${
            errors.date ? 'border-red-500' : 'border-line'
          }`}
        />
        {errors.date && <p className="mt-1 text-sm text-red-400">{errors.date}</p>}
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-ink-soft mb-1">
          Amount ($)
        </label>
        <input
          type="number"
          id="amount"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={formData.amount}
          onChange={(e) => handleChange('amount', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent ${
            errors.amount ? 'border-red-500' : 'border-line'
          }`}
        />
        {errors.amount && <p className="mt-1 text-sm text-red-400">{errors.amount}</p>}
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-ink-soft mb-1">
          Category
        </label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => handleChange('category', e.target.value as ExpenseCategory)}
          className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {EXPENSE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-ink-soft mb-1">
          Description
        </label>
        <input
          type="text"
          id="description"
          placeholder="Enter expense description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent ${
            errors.description ? 'border-red-500' : 'border-line'
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-400">{errors.description}</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-accent text-accent-ink py-2 px-4 rounded-lg hover:bg-accent-strong focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors font-medium focus:ring-offset-canvas"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-panel-raised text-ink-soft py-2 px-4 rounded-lg hover:bg-line focus:outline-none focus:ring-2 focus:ring-line focus:ring-offset-2 transition-colors font-medium focus:ring-offset-canvas"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
