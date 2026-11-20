import { z } from 'zod';
import { PATTERN_CONDITIONS } from '@/features/investing/lib/technicals';
import { SYMBOL_PATTERN } from '@/features/investing/lib/types';

/** Requests to /api/markets/analysis. Shared by the route (validation) and the assistant's tools. */
export const symbolField = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .pipe(z.string().regex(SYMBOL_PATTERN, 'Not a valid ticker symbol'))
  .describe('Ticker symbol, e.g. SPY, QQQ, AAPL');

export const TrendRequest = z.object({ kind: z.literal('trend'), symbol: symbolField });

export const PatternRequest = z.object({
  kind: z.literal('pattern'),
  symbol: symbolField,
  condition: z.enum(PATTERN_CONDITIONS),
  horizon_days: z.number().int().min(5).max(250).default(20),
  level: z.number().positive().optional(),
});

export const AnalysisRequest = z.discriminatedUnion('kind', [TrendRequest, PatternRequest]);
export type AnalysisRequest = z.input<typeof AnalysisRequest>;
