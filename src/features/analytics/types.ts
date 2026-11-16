import { ExpenseCategory } from '@/features/expenses/types';

export interface VendorStats {
  vendor: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
  averageAmount: number;
  topCategory: ExpenseCategory;
  categoryBreakdown: Record<ExpenseCategory, number>;
}
