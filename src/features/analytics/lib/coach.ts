import { z } from 'zod';
import { endOfMonth, format, getDaysInMonth, getDate, parseISO, startOfMonth, subMonths } from 'date-fns';
import { Expense, ExpenseCategory } from '@/features/expenses/types';
import { EXPENSE_CATEGORIES } from '@/features/expenses/constants';
import { filterExpenses } from '@/features/expenses/lib/filters';
import {
  calculateBudgetStreak,
  calculateCategoryBreakdown,
  calculateVendorStats,
  findRepeatedCharges,
  suggestDailyBudget,
} from '@/features/analytics/lib/stats';

/*
 * Contract for the budget coach (POST /api/coach). The browser sends an aggregate summary of
 * the month (totals by category and vendor, comparisons, streak), never individual expenses,
 * and Claude writes a few plain-English insights about it. Client-safe: no SDK imports.
 */

const money = z.number().finite().min(0);
const shortText = z.string().max(100);
const category = z.enum(EXPENSE_CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]]);

export const CoachSummarySchema = z.object({
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  month: shortText,
  daysElapsed: z.number().int().min(1).max(31),
  daysInMonth: z.number().int().min(28).max(31),
  monthTotal: money,
  expenseCount: z.number().int().min(1),
  /** monthTotal scaled to the full month at the current daily pace. */
  projectedMonthTotal: money,
  priorMonths: z.array(z.object({ month: shortText, total: money, expenseCount: z.number().int().min(0) })).max(3),
  categories: z
    .array(z.object({ category, thisMonth: money, priorMonthlyAverage: money.nullable() }))
    .max(EXPENSE_CATEGORIES.length),
  topVendors: z
    .array(z.object({ vendor: shortText, thisMonth: money, count: z.number().int().min(1), priorMonthlyAverage: money.nullable() }))
    .max(8),
  repeatedCharges: z
    .array(z.object({ vendor: shortText, amount: money, count: z.number().int().min(2), dates: z.array(z.string().max(10)).max(31) }))
    .max(5),
  budget: z.object({
    dailyBudget: money,
    streakDays: z.number().int().min(0),
    daysOverBudgetThisMonth: z.number().int().min(0),
    suggestion: z
      .object({ amount: money, hitRatePercent: z.number().min(0).max(100), basisDays: z.number().int().min(1) })
      .nullable(),
  }),
});
export type CoachSummary = z.infer<typeof CoachSummarySchema>;

/** Shape Claude must return (structured output). Kept free of length constraints; the server trims. */
export const CoachInsightsSchema = z.object({
  headline: z.string().describe('One sentence summing up the month so far'),
  insights: z
    .array(
      z.object({
        kind: z.enum(['positive', 'watch', 'tip']).describe('positive = going well, watch = worth attention, tip = an idea'),
        title: z.string().describe('A few words, e.g. "Dining out is up"'),
        detail: z.string().describe('One or two sentences with the supporting figures'),
      })
    )
    .describe('Two or three insights, most important first'),
  suggestion: z.string().describe('One concrete, doable suggestion for the rest of the month'),
});
export type CoachInsights = z.infer<typeof CoachInsightsSchema>;

const round = (n: number) => Math.round(n * 100) / 100;

function monthExpenses(expenses: Expense[], month: Date) {
  return filterExpenses(expenses, {
    startDate: format(startOfMonth(month), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(month), 'yyyy-MM-dd'),
    category: 'All',
    searchQuery: '',
  });
}

/**
 * Summarize the current month for the coach. Returns null when the month has no expenses.
 * Prior months are the up-to-three full months before this one that have any data.
 */
export function buildCoachSummary(expenses: Expense[], dailyBudget: number, today = new Date()): CoachSummary | null {
  const current = monthExpenses(expenses, today);
  if (current.length === 0) return null;

  const earliest = expenses.reduce((min, e) => (e.date < min ? e.date : min), current[0].date);
  const prior = [1, 2, 3]
    .map((offset) => subMonths(today, offset))
    .filter((month) => endOfMonth(month) >= parseISO(earliest))
    .map((month) => ({ month, expenses: monthExpenses(expenses, month) }));
  const priorAll = prior.flatMap((p) => p.expenses);
  const perMonth = (total: number | undefined) => (prior.length ? round((total ?? 0) / prior.length) : null);

  const monthTotal = current.reduce((sum, e) => sum + e.amount, 0);
  const daysElapsed = getDate(today);
  const daysInMonth = getDaysInMonth(today);

  const priorByCategory = new Map(calculateCategoryBreakdown(priorAll).map((c) => [c.category, c.amount]));
  const currentByCategory = new Map(calculateCategoryBreakdown(current).map((c) => [c.category, c.amount]));
  const categories = EXPENSE_CATEGORIES.filter((c) => currentByCategory.has(c) || priorByCategory.has(c))
    .map((c) => ({ category: c, thisMonth: round(currentByCategory.get(c) ?? 0), priorMonthlyAverage: perMonth(priorByCategory.get(c)) }))
    .sort((a, b) => b.thisMonth - a.thisMonth);

  const priorByVendor = new Map(calculateVendorStats(priorAll).map((v) => [v.vendor, v.totalAmount]));
  const topVendors = calculateVendorStats(current)
    .slice(0, 8)
    .map((v) => ({
      vendor: v.vendor.slice(0, 100),
      thisMonth: round(v.totalAmount),
      count: v.transactionCount,
      priorMonthlyAverage: perMonth(priorByVendor.get(v.vendor)),
    }));

  const dailyTotals = new Map<string, number>();
  for (const e of current) dailyTotals.set(e.date, (dailyTotals.get(e.date) ?? 0) + e.amount);
  const suggestion = suggestDailyBudget(expenses, today);

  return {
    today: format(today, 'yyyy-MM-dd'),
    month: format(today, 'MMMM yyyy'),
    daysElapsed,
    daysInMonth,
    monthTotal: round(monthTotal),
    expenseCount: current.length,
    projectedMonthTotal: round((monthTotal / daysElapsed) * daysInMonth),
    priorMonths: prior.map((p) => ({
      month: format(p.month, 'MMMM yyyy'),
      total: round(p.expenses.reduce((sum, e) => sum + e.amount, 0)),
      expenseCount: p.expenses.length,
    })),
    categories,
    topVendors,
    repeatedCharges: findRepeatedCharges(current)
      .slice(0, 5)
      .map((r) => ({ ...r, vendor: r.vendor.slice(0, 100), amount: round(r.amount) })),
    budget: {
      dailyBudget,
      streakDays: calculateBudgetStreak(expenses, dailyBudget, today),
      daysOverBudgetThisMonth: [...dailyTotals.values()].filter((total) => total > dailyBudget).length,
      suggestion: suggestion && {
        amount: suggestion.amount,
        hitRatePercent: Math.round(suggestion.hitRate * 100),
        basisDays: suggestion.basisDays,
      },
    },
  };
}
