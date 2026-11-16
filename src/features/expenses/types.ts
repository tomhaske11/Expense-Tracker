export type ExpenseCategory =
  | 'Food'
  | 'Transportation'
  | 'Entertainment'
  | 'Shopping'
  | 'Bills'
  | 'Other';

export interface Expense {
  id: string;
  date: string; // ISO date string
  amount: number;
  category: ExpenseCategory;
  description: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface ExpenseFormData {
  date: string;
  amount: string;
  category: ExpenseCategory;
  description: string;
}

export interface ExpenseFilters {
  startDate: string | null;
  endDate: string | null;
  category: ExpenseCategory | 'All';
  searchQuery: string;
}

export interface ExpenseSummary {
  totalSpending: number;
  monthlySpending: number;
  categoryBreakdown: {
    category: ExpenseCategory;
    amount: number;
    percentage: number;
  }[];
  expenseCount: number;
}

export type DateRangeFilter = 'last7days' | 'last30days' | 'thisMonth' | 'thisYear' | 'allTime';
