import { format, isValid, parseISO } from 'date-fns';
import { Expense, ExpenseCategory } from '@/features/expenses/types';
import { filterExpenses } from '@/features/expenses/lib/filters';
import {
  calculateBudgetStreak,
  calculateCategoryBreakdown,
  calculateMonthlyTotals,
  calculateVendorStats,
  calculateWeekdayTotals,
} from '@/features/analytics/lib/stats';
import { z } from 'zod';
import {
  BudgetStreakInput,
  ProposeChangesInput,
  QueryExpensesInput,
  SummarizeSpendingInput,
} from '@/features/assistant/lib/tools';

/*
 * Runs the assistant's tools in the browser against the user's expenses.
 * Pure functions: callers pass the current expenses and get JSON-serializable results.
 */

export type ToolOutcome = { ok: true; result: unknown } | { ok: false; error: string };

/** One validated change from a propose_changes call, ready to show and apply. */
export interface ProposedChange {
  expenseId: string;
  action: 'update' | 'delete';
  reason: string;
  before: Expense;
  /** update only: the expense's fields after the change. */
  after?: Pick<Expense, 'date' | 'amount' | 'category' | 'description'>;
}

export interface Proposal {
  summary: string;
  changes: ProposedChange[];
}

const VENDOR_LIMIT = 25;
const round = (n: number) => Math.round(n * 100) / 100;

const toRow = (e: Expense) => ({
  id: e.id,
  date: e.date,
  amount: e.amount,
  category: e.category,
  description: e.description,
});

function checkDay(value: string | undefined, label: string): string | null {
  if (value !== undefined && !isValid(parseISO(value))) return `${label} "${value}" is not a valid date.`;
  return null;
}

function inRange(expenses: Expense[], input: { start_date?: string; end_date?: string; category?: ExpenseCategory }) {
  return filterExpenses(expenses, {
    startDate: input.start_date ?? null,
    endDate: input.end_date ?? null,
    category: input.category ?? 'All',
    searchQuery: '',
  });
}

function rangeError(input: { start_date?: string; end_date?: string }): string | null {
  const error = checkDay(input.start_date, 'start_date') ?? checkDay(input.end_date, 'end_date');
  if (error) return error;
  if (input.start_date && input.end_date && input.start_date > input.end_date) {
    return 'start_date is after end_date.';
  }
  return null;
}

function queryExpenses(input: QueryExpensesInput, expenses: Expense[]): ToolOutcome {
  const error = rangeError(input);
  if (error) return { ok: false, error };

  let matches = filterExpenses(expenses, {
    startDate: input.start_date ?? null,
    endDate: input.end_date ?? null,
    category: input.category ?? 'All',
    searchQuery: input.search?.trim() ?? '',
  });
  if (input.min_amount !== undefined) matches = matches.filter((e) => e.amount >= input.min_amount!);
  if (input.max_amount !== undefined) matches = matches.filter((e) => e.amount <= input.max_amount!);

  const sort = input.sort ?? 'date_desc';
  const sorted = [...matches].sort((a, b) => {
    if (sort === 'amount_desc') return b.amount - a.amount;
    const byDate = a.date.localeCompare(b.date);
    return sort === 'date_asc' ? byDate : -byDate;
  });
  const limit = input.limit ?? 50;

  return {
    ok: true,
    result: {
      matched_count: matches.length,
      matched_total: round(matches.reduce((sum, e) => sum + e.amount, 0)),
      returned_count: Math.min(limit, sorted.length),
      expenses: sorted.slice(0, limit).map(toRow),
    },
  };
}

function summarizeSpending(input: SummarizeSpendingInput, expenses: Expense[]): ToolOutcome {
  const error = rangeError(input);
  if (error) return { ok: false, error };

  const matches = inRange(expenses, input);
  const total = round(matches.reduce((sum, e) => sum + e.amount, 0));
  const base = { expense_count: matches.length, total };

  switch (input.group_by) {
    case 'category':
      return {
        ok: true,
        result: {
          ...base,
          groups: calculateCategoryBreakdown(matches).map((c) => ({
            category: c.category,
            total: round(c.amount),
            percent: round(c.percentage),
          })),
        },
      };
    case 'vendor': {
      const vendors = calculateVendorStats(matches);
      return {
        ok: true,
        result: {
          ...base,
          vendor_count: vendors.length,
          groups: vendors.slice(0, VENDOR_LIMIT).map((v) => ({
            vendor: v.vendor,
            total: round(v.totalAmount),
            percent: round(v.percentage),
            count: v.transactionCount,
            average: round(v.averageAmount),
            top_category: v.topCategory,
          })),
          ...(vendors.length > VENDOR_LIMIT && { note: `Only the top ${VENDOR_LIMIT} vendors are listed.` }),
        },
      };
    }
    case 'month':
      return {
        ok: true,
        result: {
          ...base,
          groups: calculateMonthlyTotals(matches).map((m) => ({ ...m, total: round(m.total) })),
        },
      };
    case 'weekday':
      return {
        ok: true,
        result: {
          ...base,
          groups: calculateWeekdayTotals(matches).map((d) => ({ ...d, total: round(d.total) })),
        },
      };
  }
}

/**
 * Check each proposed change against the current data and the same rules as ExpenseForm.
 * Valid changes become a Proposal for the user to review; invalid ones are reported back to Claude.
 */
export function validateProposal(
  input: ProposeChangesInput,
  expenses: Expense[],
  today: Date
): { proposal: Proposal; rejected: { expense_id: string; error: string }[] } {
  const byId = new Map(expenses.map((e) => [e.id, e]));
  const todayKey = format(today, 'yyyy-MM-dd');
  const seen = new Set<string>();
  const changes: ProposedChange[] = [];
  const rejected: { expense_id: string; error: string }[] = [];

  for (const change of input.changes) {
    const reject = (error: string) => rejected.push({ expense_id: change.expense_id, error });
    const before = byId.get(change.expense_id);
    if (!before) {
      reject('No expense has this id.');
      continue;
    }
    if (seen.has(change.expense_id)) {
      reject('This expense already appears earlier in the proposal.');
      continue;
    }

    if (change.action === 'delete') {
      seen.add(before.id);
      changes.push({ expenseId: before.id, action: 'delete', reason: change.reason, before });
      continue;
    }

    const after = {
      date: change.date ?? before.date,
      amount: change.amount !== undefined ? round(change.amount) : before.amount,
      category: change.category ?? before.category,
      description: change.description !== undefined ? change.description.trim() : before.description,
    };
    if (!(after.amount > 0)) {
      reject('Amount must be greater than 0.');
      continue;
    }
    if (!isValid(parseISO(after.date)) || after.date > todayKey) {
      reject('Date must be a valid day no later than today.');
      continue;
    }
    if (!after.description) {
      reject('Description cannot be empty.');
      continue;
    }
    const unchanged =
      after.date === before.date &&
      after.amount === before.amount &&
      after.category === before.category &&
      after.description === before.description;
    if (unchanged) {
      reject('This update would not change anything.');
      continue;
    }
    seen.add(before.id);
    changes.push({ expenseId: before.id, action: 'update', reason: change.reason, before, after });
  }

  return { proposal: { summary: input.summary, changes }, rejected };
}

function parseInput<T>(schema: z.ZodType<T>, raw: unknown): { data: T } | { error: string } {
  const parsed = schema.safeParse(raw);
  return parsed.success ? { data: parsed.data } : { error: `Invalid input: ${z.prettifyError(parsed.error)}` };
}

/** Validate the input to propose_changes (the caller turns it into a Proposal via validateProposal). */
export const parseProposeChangesInput = (raw: unknown) => parseInput(ProposeChangesInput, raw);

/**
 * Validate and run a read-only tool. propose_changes is handled by the caller
 * (it needs UI state), so it is rejected here.
 */
export function runReadTool(name: string, rawInput: unknown, expenses: Expense[], today: Date): ToolOutcome {
  switch (name) {
    case 'query_expenses': {
      const input = parseInput(QueryExpensesInput, rawInput);
      return 'error' in input ? { ok: false, error: input.error } : queryExpenses(input.data, expenses);
    }
    case 'summarize_spending': {
      const input = parseInput(SummarizeSpendingInput, rawInput);
      return 'error' in input ? { ok: false, error: input.error } : summarizeSpending(input.data, expenses);
    }
    case 'get_budget_streak': {
      const input = parseInput(BudgetStreakInput, rawInput);
      if ('error' in input) return { ok: false, error: input.error };
      const { daily_budget } = input.data;
      return {
        ok: true,
        result: { daily_budget, streak_days: calculateBudgetStreak(expenses, daily_budget, today) },
      };
    }
    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}
