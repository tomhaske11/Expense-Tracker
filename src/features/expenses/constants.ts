import { ExpenseCategory } from '@/features/expenses/types';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Other',
];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: '#10b981',
  Transportation: '#3b82f6',
  Entertainment: '#8b5cf6',
  Shopping: '#ec4899',
  Bills: '#f59e0b',
  Other: '#6b7280',
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  Food: '🍽️',
  Transportation: '🚗',
  Entertainment: '🎮',
  Shopping: '🛍️',
  Bills: '📄',
  Other: '📦',
};

/** Max characters accepted by natural-language quick add. */
export const QUICK_ADD_MAX_LENGTH = 300;

export const STORAGE_KEY = 'expense-tracker-data';
