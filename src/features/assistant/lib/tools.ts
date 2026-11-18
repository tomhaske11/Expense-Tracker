import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '@/features/expenses/constants';
import { ExpenseCategory } from '@/features/expenses/types';

/*
 * Tools the assistant can call. One zod schema per tool is the single source of truth:
 * the server converts it to JSON Schema for Claude, and the browser (which runs the
 * tools, because the data lives in localStorage) validates Claude's input against it.
 * Client-safe: no SDK imports.
 */

const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe('A date as yyyy-MM-dd');
const category = z.enum(EXPENSE_CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]]);

const dateRange = {
  start_date: isoDay.optional().describe('First day to include (yyyy-MM-dd). Omit for no lower bound.'),
  end_date: isoDay.optional().describe('Last day to include (yyyy-MM-dd). Omit for no upper bound.'),
};

export const QueryExpensesInput = z.object({
  ...dateRange,
  category: category.optional().describe('Only this category'),
  search: z
    .string()
    .max(100)
    .optional()
    .describe('Case-insensitive text matched against the description (vendor), category and amount'),
  min_amount: z.number().optional().describe('Only expenses of at least this many dollars'),
  max_amount: z.number().optional().describe('Only expenses of at most this many dollars'),
  sort: z.enum(['date_desc', 'date_asc', 'amount_desc']).optional().describe('Order of returned rows. Default date_desc.'),
  limit: z.number().int().min(1).max(100).optional().describe('Max rows to return (1-100). Default 50.'),
});

export const SummarizeSpendingInput = z.object({
  ...dateRange,
  group_by: z
    .enum(['category', 'vendor', 'month', 'weekday'])
    .describe('How to group the totals. vendor groups by description; month uses yyyy-MM.'),
  category: category.optional().describe('Only include this category before grouping'),
});

export const BudgetStreakInput = z.object({
  daily_budget: z.number().positive().describe('Daily spending limit in dollars'),
});

export const ProposeChangesInput = z.object({
  summary: z.string().min(1).max(300).describe('One sentence describing the proposal, shown as its title'),
  changes: z
    .array(
      z.object({
        expense_id: z.string().describe('id of the expense, exactly as returned by query_expenses'),
        action: z.enum(['update', 'delete']),
        reason: z.string().max(200).describe('Short reason shown to the user, e.g. "Duplicate of the 3 Oct charge"'),
        category: category.optional().describe('update only: new category'),
        description: z.string().max(100).optional().describe('update only: new description / vendor name'),
        amount: z.number().optional().describe('update only: new amount in dollars'),
        date: isoDay.optional().describe('update only: new date'),
      })
    )
    .min(1)
    .max(50),
});

export type QueryExpensesInput = z.infer<typeof QueryExpensesInput>;
export type SummarizeSpendingInput = z.infer<typeof SummarizeSpendingInput>;
export type ProposeChangesInput = z.infer<typeof ProposeChangesInput>;

export const ASSISTANT_TOOLS = {
  query_expenses: {
    schema: QueryExpensesInput,
    description:
      'List individual expenses matching filters, with the total count and sum of ALL matches (not just the returned rows). Use it to look up specific transactions, find duplicates, or get ids before proposing changes.',
  },
  summarize_spending: {
    schema: SummarizeSpendingInput,
    description:
      'Total spending grouped by category, vendor, month or weekday over an optional date range. Use it for breakdowns, rankings and comparisons instead of adding up rows yourself.',
  },
  get_budget_streak: {
    schema: BudgetStreakInput,
    description:
      'Number of consecutive days, ending today, on which daily spending stayed within the given budget.',
  },
  propose_changes: {
    schema: ProposeChangesInput,
    description:
      "Propose edits or deletions (e.g. fix a category, tidy a vendor name, remove a duplicate). Nothing is saved: the app shows the proposal to the user, who approves or rejects it. Only call this when the user asked for changes or agreed to your suggestion. Use ids from query_expenses.",
  },
} as const;

export type AssistantToolName = keyof typeof ASSISTANT_TOOLS;
