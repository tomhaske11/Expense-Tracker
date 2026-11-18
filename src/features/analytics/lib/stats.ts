import { format, parseISO, startOfDay, subDays, differenceInCalendarDays } from 'date-fns';
import { Expense, ExpenseCategory } from '@/features/expenses/types';
import { VendorStats } from '@/features/analytics/types';

export function calculateCategoryBreakdown(expenses: Expense[]) {
  const categoryTotals: Record<string, number> = {};
  let total = 0;

  expenses.forEach((expense) => {
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    total += expense.amount;
  });

  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category: category as ExpenseCategory,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function calculateVendorStats(expenses: Expense[]): VendorStats[] {
  if (expenses.length === 0) return [];

  const totalSpending = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Group expenses by vendor (using description as vendor name)
  const vendorMap = new Map<string, Expense[]>();

  expenses.forEach((expense) => {
    const vendor = expense.description.trim() || 'Unknown';
    if (!vendorMap.has(vendor)) {
      vendorMap.set(vendor, []);
    }
    vendorMap.get(vendor)!.push(expense);
  });

  // Calculate stats for each vendor
  const vendorStats: VendorStats[] = [];

  vendorMap.forEach((vendorExpenses, vendor) => {
    const totalAmount = vendorExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const transactionCount = vendorExpenses.length;
    const averageAmount = totalAmount / transactionCount;

    // Calculate category breakdown
    const categoryBreakdown: Record<string, number> = {};
    vendorExpenses.forEach((expense) => {
      categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;
    });

    // Find top category
    let topCategory: ExpenseCategory = vendorExpenses[0].category;
    let maxAmount = 0;
    Object.entries(categoryBreakdown).forEach(([category, amount]) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        topCategory = category as ExpenseCategory;
      }
    });

    vendorStats.push({
      vendor,
      totalAmount,
      percentage: totalSpending > 0 ? (totalAmount / totalSpending) * 100 : 0,
      transactionCount,
      averageAmount,
      topCategory,
      categoryBreakdown: categoryBreakdown as Record<ExpenseCategory, number>,
    });
  });

  // Sort by total amount descending
  return vendorStats.sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Number of consecutive days, ending today, on which spending stayed within `dailyBudget`.
 * Days with no expenses count as within budget. The streak never reaches back
 * before the first recorded expense, so an empty history yields 0.
 */
export function calculateBudgetStreak(expenses: Expense[], dailyBudget: number, today = new Date()): number {
  if (expenses.length === 0) return 0;

  const dailyTotals = new Map<string, number>();
  let earliest = startOfDay(today);
  for (const expense of expenses) {
    const day = startOfDay(parseISO(expense.date));
    if (day < earliest) earliest = day;
    const key = format(day, 'yyyy-MM-dd');
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + expense.amount);
  }

  const maxDays = differenceInCalendarDays(today, earliest) + 1;
  let streak = 0;
  for (let i = 0; i < maxDays; i++) {
    const key = format(subDays(today, i), 'yyyy-MM-dd');
    if ((dailyTotals.get(key) ?? 0) > dailyBudget) break;
    streak++;
  }
  return streak;
}

/** Spending per calendar month (yyyy-MM), oldest first. Months with no expenses are omitted. */
export function calculateMonthlyTotals(expenses: Expense[]): { month: string; total: number; count: number }[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const expense of expenses) {
    const month = format(parseISO(expense.date), 'yyyy-MM');
    const entry = totals.get(month) ?? { total: 0, count: 0 };
    entry.total += expense.amount;
    entry.count++;
    totals.set(month, entry);
  }
  return [...totals.entries()]
    .map(([month, entry]) => ({ month, ...entry }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Spending per day of the week, Monday first. Every weekday is included, even with no spending. */
export function calculateWeekdayTotals(expenses: Expense[]): { weekday: string; total: number; count: number }[] {
  const totals = WEEKDAYS.map((weekday) => ({ weekday, total: 0, count: 0 }));
  for (const expense of expenses) {
    // date-fns 'i' is the ISO day of week: 1 = Monday … 7 = Sunday.
    const entry = totals[Number(format(parseISO(expense.date), 'i')) - 1];
    entry.total += expense.amount;
    entry.count++;
  }
  return totals;
}
