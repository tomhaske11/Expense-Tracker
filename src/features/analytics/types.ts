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

// ---- Analytics dashboard (/analytics) ----
// Date range for filtering analytics
export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

// Analytics filters combining date range and category
export interface AnalyticsFilters extends DateRange {
  category: ExpenseCategory | 'All';
}

// Daily spending data point for trend analysis
export interface DailySpending {
  date: string;
  amount: number;
  count: number;
}

// Monthly spending data point for comparison
export interface MonthlySpending {
  month: string; // Format: "YYYY-MM"
  monthLabel: string; // Format: "Jan 2024"
  amount: number;
  count: number;
  categories: Record<ExpenseCategory, number>;
}

// Category spending data with additional insights
export interface CategorySpending {
  category: ExpenseCategory;
  amount: number;
  percentage: number;
  count: number;
  averageAmount: number;
}

// Weekly spending data point
export interface WeeklySpending {
  week: string; // Format: "Week of Jan 1"
  weekNumber: number;
  amount: number;
  count: number;
}

// Comprehensive analytics summary
export interface AnalyticsSummary {
  // Overall statistics
  totalSpending: number;
  totalTransactions: number;
  averageTransaction: number;

  // Time-based statistics
  currentMonthSpending: number;
  previousMonthSpending: number;
  monthOverMonthChange: number;

  // Category statistics
  topCategory: CategorySpending | null;
  categoryBreakdown: CategorySpending[];

  // Trend data
  dailyTrend: DailySpending[];
  weeklyTrend: WeeklySpending[];
  monthlyTrend: MonthlySpending[];

  // Date range info
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
}

// Time period options for grouping
export type TimePeriod = 'daily' | 'weekly' | 'monthly';

// Comparison type for analytics
export type ComparisonType = 'month-over-month' | 'year-over-year' | 'category';
