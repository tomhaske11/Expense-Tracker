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

export interface BudgetSuggestion {
  /** Suggested daily budget in dollars (a multiple of $5, at least $10). */
  amount: number;
  /** Share of days in the window (0-1) on which spending was at or below `amount`. */
  hitRate: number;
  /** Days of history the suggestion is based on. */
  basisDays: number;
}

/**
 * A daily budget the user met on about three days in four over the last `windowDays`
 * (the 75th percentile of daily spending, rounded up to $5). Days without expenses count
 * as $0. Returns null with less than two weeks of history.
 */
export function suggestDailyBudget(expenses: Expense[], today = new Date(), windowDays = 90): BudgetSuggestion | null {
  if (expenses.length === 0) return null;

  const end = startOfDay(today);
  let start = subDays(end, windowDays - 1);
  const earliest = expenses.reduce((min, e) => {
    const day = startOfDay(parseISO(e.date));
    return day < min ? day : min;
  }, end);
  if (earliest > start) start = earliest;

  const basisDays = differenceInCalendarDays(end, start) + 1;
  if (basisDays < 14) return null;

  const totals = new Map<string, number>();
  for (const expense of expenses) {
    totals.set(expense.date, (totals.get(expense.date) ?? 0) + expense.amount);
  }
  const daily: number[] = [];
  for (let i = 0; i < basisDays; i++) {
    daily.push(totals.get(format(subDays(end, i), 'yyyy-MM-dd')) ?? 0);
  }

  const sorted = [...daily].sort((a, b) => a - b);
  const p75 = sorted[Math.ceil(sorted.length * 0.75) - 1];
  const amount = Math.max(10, Math.ceil(p75 / 5) * 5);
  const hitRate = daily.filter((total) => total <= amount).length / basisDays;
  return { amount, hitRate, basisDays };
}

/**
 * Charges with the same vendor (case-insensitive) and amount that occur more than once,
 * e.g. duplicate subscriptions. Sorted by total, largest first.
 */
export function findRepeatedCharges(expenses: Expense[]): { vendor: string; amount: number; count: number; dates: string[] }[] {
  const groups = new Map<string, { vendor: string; amount: number; dates: string[] }>();
  for (const expense of expenses) {
    const vendor = expense.description.trim() || 'Unknown';
    const key = `${vendor.toLowerCase()}|${expense.amount}`;
    const group = groups.get(key) ?? { vendor, amount: expense.amount, dates: [] };
    group.dates.push(expense.date);
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((g) => g.dates.length > 1)
    .map((g) => ({ ...g, count: g.dates.length, dates: g.dates.sort() }))
    .sort((a, b) => b.amount * b.count - a.amount * a.count);
}

/**
 * A vendor name reduced for matching: lower case, store numbers and punctuation removed
 * ("CHIPOTLE #1234" and "Chipotle" both become "chipotle").
 */
export function normalizeVendor(name: string): string {
  return name
    .toLowerCase()
    .replace(/#\s*\d+/g, ' ')
    .replace(/[^a-z0-9& ]+/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
