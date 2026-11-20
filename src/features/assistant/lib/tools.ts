import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '@/features/expenses/constants';
import { ExpenseCategory } from '@/features/expenses/types';
import { PATTERN_CONDITIONS } from '@/features/investing/lib/technicals';

/*
 * Tools the assistant can call. One zod schema per tool is the single source of truth:
 * the server converts it to JSON Schema for Claude, and the browser (which runs the
 * tools, against the cached expenses and our market-data API) validates Claude's input against it.
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
  offset: z.number().int().min(0).optional().describe('Rows to skip, for paging through more than `limit` matches. Default 0.'),
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

export const ListVendorsInput = z.object({
  category: category.optional().describe('Only vendors with expenses in this category'),
});

export const FindDuplicatesInput = z.object({
  max_days_apart: z
    .number()
    .int()
    .min(0)
    .max(31)
    .optional()
    .describe('How many days apart two identical charges can be and still count. Default 3.'),
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

const ticker = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9.-]{0,9}$/)
  .describe('Ticker symbol, e.g. SPY (S&P 500 fund), QQQ (Nasdaq-100 fund), DIA (Dow), IWM (Russell 2000), AAPL');

export const MarketTrendInput = z.object({ symbol: ticker });

export const MarketPatternInput = z.object({
  symbol: ticker,
  condition: z.enum(PATTERN_CONDITIONS).describe(
    'The event to test. "50d"/"200d" are the 50- and 200-day simple moving averages. golden_cross / death_cross: the 50-day crossing above / below the 200-day. *_level conditions need `level`.'
  ),
  horizon_days: z.number().int().min(5).max(250).optional().describe('Trading days after each event to measure the return over (21 ≈ 1 month, 63 ≈ 3 months). Default 20.'),
  level: z.number().positive().optional().describe('Price level for crosses_above_level / crosses_below_level, in dollars.'),
});

export const MyHoldingsInput = z.object({});

export type MarketTrendInput = z.infer<typeof MarketTrendInput>;
export type MarketPatternInput = z.infer<typeof MarketPatternInput>;
export type QueryExpensesInput = z.infer<typeof QueryExpensesInput>;
export type SummarizeSpendingInput = z.infer<typeof SummarizeSpendingInput>;
export type ProposeChangesInput = z.infer<typeof ProposeChangesInput>;
export type ListVendorsInput = z.infer<typeof ListVendorsInput>;
export type FindDuplicatesInput = z.infer<typeof FindDuplicatesInput>;

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
  list_vendors: {
    schema: ListVendorsInput,
    description:
      'Every distinct vendor name (description) with its count, total, categories and date range, sorted so spelling variants ("CHIPOTLE #1234", "chipotle", "Chipotle") sit next to each other. Use it to find inconsistent vendor names and vendors filed under several categories.',
  },
  find_possible_duplicates: {
    schema: FindDuplicatesInput,
    description:
      'Groups of expenses with the same amount and the same vendor (ignoring case, punctuation and store numbers) within a few days of each other. These may be one charge recorded twice, or a genuine repeat; judge from the dates and vendor.',
  },
  get_budget_streak: {
    schema: BudgetStreakInput,
    description:
      'Number of consecutive days, ending today, on which daily spending stayed within the given budget.',
  },
  get_market_trend: {
    schema: MarketTrendInput,
    description:
      'Technical picture for one ticker from up to ~5 years of daily closes: price, returns (1d to 1y, YTD), 20/50/200-day moving averages and how far the price is from each, RSI(14), 52-week high/low, volatility, 1-year max drawdown, nearby support and resistance levels (from swing highs/lows), the overall trend, and recent moving-average crossings.',
  },
  test_market_pattern: {
    schema: MarketPatternInput,
    description:
      "Historical base rates for one ticker: every past time the condition happened, what the return was over the following horizon_days, compared with the same horizon from any day (the baseline). Also the most recent occurrences and whether one is in progress. Use it to say what has tended to follow a signal, with the sample size, instead of relying on general rules of thumb.",
  },
  get_my_holdings: {
    schema: MyHoldingsInput,
    description: "The user's investment holdings as they entered them: ticker, shares, account (Brokerage, 401(k), IRA...) and total cost if given. No prices; use get_market_trend for those.",
  },
  propose_changes: {
    schema: ProposeChangesInput,
    description:
      "Propose edits or deletions (e.g. fix a category, tidy a vendor name, remove a duplicate). Nothing is saved: the app shows the proposal to the user, who approves or rejects it. Only call this when the user asked for changes or agreed to your suggestion. Use ids from query_expenses.",
  },
} as const;

export type AssistantToolName = keyof typeof ASSISTANT_TOOLS;
