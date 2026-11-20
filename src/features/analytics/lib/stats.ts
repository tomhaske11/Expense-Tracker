import { format, parseISO, startOfDay, subDays, differenceInCalendarDays } from 'date-fns';
import { Expense, ExpenseCategory } from '@/features/expenses/types';
import { VendorStats } from '@/features/analytics/types';
import { normalizeVendor } from '@/lib/utils';

/** Spending per category, largest first, with each category's share, transaction count and average. */
export function calculateCategoryBreakdown(expenses: Expense[]) {
  const totals = new Map<ExpenseCategory, { amount: number; count: number }>();
  let total = 0;

  for (const expense of expenses) {
    const entry = totals.get(expense.category) ?? { amount: 0, count: 0 };
    entry.amount += expense.amount;
    entry.count++;
    totals.set(expense.category, entry);
    total += expense.amount;
  }

  return [...totals.entries()]
    .map(([category, { amount, count }]) => ({
      category,
      amount,
      count,
      average: amount / count,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** Total and count of a list of expenses. */
export function summarize(expenses: Expense[]) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return { total, count: expenses.length, average: expenses.length > 0 ? total / expenses.length : 0 };
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


/** Every distinct vendor (description) with usage, sorted by normalized name so variants sit together. */
export function listVendors(expenses: Expense[]) {
  const vendors = new Map<
    string,
    { vendor: string; normalized: string; count: number; total: number; categories: Set<ExpenseCategory>; first: string; last: string }
  >();
  for (const e of expenses) {
    const vendor = e.description.trim() || 'Unknown';
    const entry = vendors.get(vendor) ?? {
      vendor,
      normalized: normalizeVendor(vendor),
      count: 0,
      total: 0,
      categories: new Set<ExpenseCategory>(),
      first: e.date,
      last: e.date,
    };
    entry.count++;
    entry.total += e.amount;
    entry.categories.add(e.category);
    if (e.date < entry.first) entry.first = e.date;
    if (e.date > entry.last) entry.last = e.date;
    vendors.set(vendor, entry);
  }
  return [...vendors.values()]
    .map((v) => ({ ...v, categories: [...v.categories] }))
    .sort((a, b) => a.normalized.localeCompare(b.normalized) || a.vendor.localeCompare(b.vendor));
}

/**
 * Groups of expenses that may be the same charge recorded twice: same amount, same normalized
 * vendor, and dates no more than `maxDaysApart` apart. Each group is sorted by date.
 */
export function findPossibleDuplicates(expenses: Expense[], maxDaysApart = 3): Expense[][] {
  const buckets = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = `${normalizeVendor(e.description)}|${Math.round(e.amount * 100)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(e);
    buckets.set(key, bucket);
  }

  const groups: Expense[][] = [];
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;
    const sorted = [...bucket].sort((a, b) => a.date.localeCompare(b.date));
    let group: Expense[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const gap = differenceInCalendarDays(parseISO(sorted[i].date), parseISO(group[group.length - 1].date));
      if (gap <= maxDaysApart) {
        group.push(sorted[i]);
      } else {
        if (group.length > 1) groups.push(group);
        group = [sorted[i]];
      }
    }
    if (group.length > 1) groups.push(group);
  }
  return groups.sort((a, b) => b[0].date.localeCompare(a[0].date));
}
