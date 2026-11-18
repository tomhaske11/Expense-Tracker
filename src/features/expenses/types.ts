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
  /** Where the expense came from. Absent on manual entries (and on data saved before imports existed). */
  source?: ExpenseSource;
}

/** Origin of an imported expense, so re-imports and re-syncs never add it twice. */
export interface ExpenseSource {
  kind: 'file' | 'bank';
  /** The transaction's id at the source (bank transaction id, or a hash for file rows). */
  externalId: string;
  /** Bank connection, for kind 'bank'. */
  connectionId?: string;
  /** Account within the connection or statement. */
  accountId?: string;
  /** The description exactly as the bank or statement gave it, for matching later imports. */
  rawDescription?: string;
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
