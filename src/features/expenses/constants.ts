import { ExpenseCategory } from '@/features/expenses/types';
import { BagIcon, BoxIcon, CarIcon, FilmIcon, Icon, ReceiptIcon, UtensilsIcon } from '@/lib/icons';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Other',
];

/**
 * Chart colors for the dark theme, validated as a set (dataviz palette check, dark surface
 * #171717): lightness band, chroma, contrast and adjacent-pair color-blind separation pass in
 * this order. Food is the brand teal. Always pair a color with the category name or icon.
 */
export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: '#14a89c',
  Transportation: '#d95926',
  Entertainment: '#3987e5',
  Shopping: '#c98500',
  Bills: '#9085e9',
  Other: '#d55181',
};

export const CATEGORY_ICONS: Record<ExpenseCategory, Icon> = {
  Food: UtensilsIcon,
  Transportation: CarIcon,
  Entertainment: FilmIcon,
  Shopping: BagIcon,
  Bills: ReceiptIcon,
  Other: BoxIcon,
};

/** Max characters accepted by natural-language quick add. */
export const QUICK_ADD_MAX_LENGTH = 300;

export const STORAGE_KEY = 'expense-tracker-data';
