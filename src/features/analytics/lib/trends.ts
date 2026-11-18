import {
  parseISO,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isWithinInterval,
  subMonths,
  differenceInCalendarDays,
} from 'date-fns';
import { Expense, ExpenseCategory } from '@/features/expenses/types';
import {
  AnalyticsSummary,
  CategorySpending,
  DailySpending,
  WeeklySpending,
  MonthlySpending,
  AnalyticsFilters,
} from '@/features/analytics/types';
import { EXPENSE_CATEGORIES } from '@/features/expenses/constants';

/**
 * Filters expenses based on date range and category
 */
export function filterExpensesForAnalytics(
  expenses: Expense[],
  filters: AnalyticsFilters
): Expense[] {
  return expenses.filter((expense) => {
    const expenseDate = parseISO(expense.date);

    // Date range filter
    if (filters.startDate && filters.endDate) {
      const start = parseISO(filters.startDate);
      const end = parseISO(filters.endDate);
      if (!isWithinInterval(expenseDate, { start, end })) {
        return false;
      }
    } else if (filters.startDate) {
      const start = parseISO(filters.startDate);
      if (expenseDate < start) {
        return false;
      }
    } else if (filters.endDate) {
      const end = parseISO(filters.endDate);
      if (expenseDate > end) {
        return false;
      }
    }

    // Category filter
    if (filters.category !== 'All' && expense.category !== filters.category) {
      return false;
    }

    return true;
  });
}

/**
 * Calculates category spending breakdown with insights
 */
export function calculateCategorySpending(expenses: Expense[]): CategorySpending[] {
  const categoryTotals: Record<string, { amount: number; count: number }> = {};
  let totalAmount = 0;

  // Aggregate by category
  expenses.forEach((expense) => {
    if (!categoryTotals[expense.category]) {
      categoryTotals[expense.category] = { amount: 0, count: 0 };
    }
    categoryTotals[expense.category].amount += expense.amount;
    categoryTotals[expense.category].count += 1;
    totalAmount += expense.amount;
  });

  // Convert to CategorySpending array
  return Object.entries(categoryTotals)
    .map(([category, data]) => ({
      category: category as ExpenseCategory,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      count: data.count,
      averageAmount: data.count > 0 ? data.amount / data.count : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Calculates daily spending trend
 */
export function calculateDailyTrend(expenses: Expense[]): DailySpending[] {
  if (expenses.length === 0) return [];

  // Find date range
  const dates = expenses.map((e) => parseISO(e.date));
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  // Generate all days in range
  const days = eachDayOfInterval({ start: minDate, end: maxDate });

  // Aggregate by day
  const dailyData: Record<string, { amount: number; count: number }> = {};

  expenses.forEach((expense) => {
    const dateKey = format(parseISO(expense.date), 'yyyy-MM-dd');
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = { amount: 0, count: 0 };
    }
    dailyData[dateKey].amount += expense.amount;
    dailyData[dateKey].count += 1;
  });

  // Create data points for all days (including zero-spending days)
  return days.map((day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const data = dailyData[dateKey] || { amount: 0, count: 0 };
    return {
      date: dateKey,
      amount: data.amount,
      count: data.count,
    };
  });
}

/**
 * Calculates weekly spending trend
 */
export function calculateWeeklyTrend(expenses: Expense[]): WeeklySpending[] {
  if (expenses.length === 0) return [];

  // Find date range
  const dates = expenses.map((e) => parseISO(e.date));
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  // Generate all weeks in range
  const weeks = eachWeekOfInterval({ start: minDate, end: maxDate }, { weekStartsOn: 0 });

  // Aggregate by week
  const weeklyData: Record<string, { amount: number; count: number }> = {};

  expenses.forEach((expense) => {
    const expenseDate = parseISO(expense.date);
    const weekStart = startOfWeek(expenseDate, { weekStartsOn: 0 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');

    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { amount: 0, count: 0 };
    }
    weeklyData[weekKey].amount += expense.amount;
    weeklyData[weekKey].count += 1;
  });

  // Create data points
  return weeks.map((week, index) => {
    const weekKey = format(week, 'yyyy-MM-dd');
    const data = weeklyData[weekKey] || { amount: 0, count: 0 };
    return {
      week: format(week, 'MMM dd'),
      weekNumber: index + 1,
      amount: data.amount,
      count: data.count,
    };
  });
}

/**
 * Calculates monthly spending trend with category breakdown
 */
export function calculateMonthlyTrend(expenses: Expense[]): MonthlySpending[] {
  if (expenses.length === 0) return [];

  // Find date range
  const dates = expenses.map((e) => parseISO(e.date));
  const minDate = startOfMonth(new Date(Math.min(...dates.map((d) => d.getTime()))));
  const maxDate = endOfMonth(new Date(Math.max(...dates.map((d) => d.getTime()))));

  // Generate all months in range
  const months = eachMonthOfInterval({ start: minDate, end: maxDate });

  // Aggregate by month and category
  const monthlyData: Record<
    string,
    { amount: number; count: number; categories: Record<ExpenseCategory, number> }
  > = {};

  expenses.forEach((expense) => {
    const monthKey = format(parseISO(expense.date), 'yyyy-MM');

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        amount: 0,
        count: 0,
        categories: {} as Record<ExpenseCategory, number>,
      };
      // Initialize all categories to 0
      EXPENSE_CATEGORIES.forEach((cat) => {
        monthlyData[monthKey].categories[cat] = 0;
      });
    }

    monthlyData[monthKey].amount += expense.amount;
    monthlyData[monthKey].count += 1;
    monthlyData[monthKey].categories[expense.category] += expense.amount;
  });

  // Create data points
  return months.map((month) => {
    const monthKey = format(month, 'yyyy-MM');
    const data = monthlyData[monthKey] || {
      amount: 0,
      count: 0,
      categories: {} as Record<ExpenseCategory, number>,
    };

    // Ensure all categories exist
    if (!data.categories || Object.keys(data.categories).length === 0) {
      data.categories = {} as Record<ExpenseCategory, number>;
      EXPENSE_CATEGORIES.forEach((cat) => {
        data.categories[cat] = 0;
      });
    }

    return {
      month: monthKey,
      monthLabel: format(month, 'MMM yyyy'),
      amount: data.amount,
      count: data.count,
      categories: data.categories,
    };
  });
}

/**
 * Calculates comprehensive analytics summary
 */
export function calculateAnalyticsSummary(
  expenses: Expense[],
  filters?: AnalyticsFilters
): AnalyticsSummary {
  // Filter expenses if filters provided
  const filteredExpenses = filters
    ? filterExpensesForAnalytics(expenses, filters)
    : expenses;

  // Basic statistics
  const totalSpending = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalTransactions = filteredExpenses.length;
  const averageTransaction = totalTransactions > 0 ? totalSpending / totalTransactions : 0;

  // Current and previous month spending
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const previousMonthStart = startOfMonth(subMonths(now, 1));
  const previousMonthEnd = endOfMonth(subMonths(now, 1));

  const currentMonthExpenses = filteredExpenses.filter((e) => {
    const date = parseISO(e.date);
    return isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd });
  });

  const previousMonthExpenses = filteredExpenses.filter((e) => {
    const date = parseISO(e.date);
    return isWithinInterval(date, { start: previousMonthStart, end: previousMonthEnd });
  });

  const currentMonthSpending = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const previousMonthSpending = previousMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const monthOverMonthChange =
    previousMonthSpending > 0
      ? ((currentMonthSpending - previousMonthSpending) / previousMonthSpending) * 100
      : currentMonthSpending > 0
      ? 100
      : 0;

  // Category breakdown
  const categoryBreakdown = calculateCategorySpending(filteredExpenses);
  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

  // Trend data
  const dailyTrend = calculateDailyTrend(filteredExpenses);
  const weeklyTrend = calculateWeeklyTrend(filteredExpenses);
  const monthlyTrend = calculateMonthlyTrend(filteredExpenses);

  // Date range
  const dates = filteredExpenses.map((e) => parseISO(e.date));
  const dateRange = {
    earliest: dates.length > 0 ? format(new Date(Math.min(...dates.map((d) => d.getTime()))), 'yyyy-MM-dd') : null,
    latest: dates.length > 0 ? format(new Date(Math.max(...dates.map((d) => d.getTime()))), 'yyyy-MM-dd') : null,
  };

  return {
    totalSpending,
    totalTransactions,
    averageTransaction,
    currentMonthSpending,
    previousMonthSpending,
    monthOverMonthChange,
    topCategory,
    categoryBreakdown,
    dailyTrend,
    weeklyTrend,
    monthlyTrend,
    dateRange,
  };
}

/**
 * Gets spending comparison between two time periods
 */
export function compareTimePeriods(
  expenses: Expense[],
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string
): {
  period1: { amount: number; count: number };
  period2: { amount: number; count: number };
  change: number;
  changePercentage: number;
} {
  const period1Expenses = expenses.filter((e) => {
    const date = parseISO(e.date);
    return isWithinInterval(date, {
      start: parseISO(period1Start),
      end: parseISO(period1End),
    });
  });

  const period2Expenses = expenses.filter((e) => {
    const date = parseISO(e.date);
    return isWithinInterval(date, {
      start: parseISO(period2Start),
      end: parseISO(period2End),
    });
  });

  const period1Amount = period1Expenses.reduce((sum, e) => sum + e.amount, 0);
  const period2Amount = period2Expenses.reduce((sum, e) => sum + e.amount, 0);

  const change = period1Amount - period2Amount;
  const changePercentage = period2Amount > 0 ? (change / period2Amount) * 100 : period1Amount > 0 ? 100 : 0;

  return {
    period1: { amount: period1Amount, count: period1Expenses.length },
    period2: { amount: period2Amount, count: period2Expenses.length },
    change,
    changePercentage,
  };
}
