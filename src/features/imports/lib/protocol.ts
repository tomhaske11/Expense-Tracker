import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '@/features/expenses/constants';
import { ExpenseCategory } from '@/features/expenses/types';
import type { SourceAccount, SourceTransaction } from '@/features/imports/types';

/*
 * Contracts for the import routes (/api/imports/*) and the bank routes (/api/bank/*),
 * shared by the browser and the server. Client-safe: no SDK imports.
 */

const category = z.enum(EXPENSE_CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]]);

// ---------- Statement column mapping (CSV) ----------

export const ColumnMappingSchema = z.object({
  headerRow: z.number().int().min(-1).describe('0-based index of the header row, or -1 if there is none'),
  dateColumn: z.number().int().min(0),
  dateOrder: z.enum(['MDY', 'DMY', 'YMD']).describe('Order of day, month and year in the date column'),
  descriptionColumn: z.number().int().min(0),
  amountColumn: z.number().int().min(0).optional().describe('Single signed amount column, if the file has one'),
  debitColumn: z.number().int().min(0).optional().describe('Money-out column, when debits and credits are separate'),
  creditColumn: z.number().int().min(0).optional().describe('Money-in column, when debits and credits are separate'),
  spendingIsNegative: z.boolean().describe('True if purchases appear as negative numbers in the amount column'),
  categoryColumn: z.number().int().min(0).optional(),
  currency: z.string().length(3).describe('ISO currency code of the amounts, e.g. USD'),
});
export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;

export const MapColumnsRequestSchema = z.object({
  rows: z.array(z.array(z.string().max(300)).max(40)).min(2).max(12),
});

// ---------- Category and vendor suggestions ----------

export const SUGGEST_MAX_ITEMS = 100;

export const SuggestRequestSchema = z.object({
  items: z
    .array(
      z.object({
        key: z.string().max(200),
        description: z.string().max(300),
        merchantName: z.string().max(200).optional(),
        amount: z.number(),
        categoryHint: z.string().max(100).optional(),
      })
    )
    .min(1)
    .max(SUGGEST_MAX_ITEMS),
});
export type SuggestRequest = z.infer<typeof SuggestRequestSchema>;

/** Structured output Claude returns for suggestions. */
export const SuggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      key: z.string(),
      category,
      description: z.string().describe('Short merchant name in title case, e.g. "Blue Bottle Coffee"'),
    })
  ),
});
export type Suggestions = z.infer<typeof SuggestionsSchema>;

// ---------- PDF statements ----------

export const PDF_MAX_BASE64_LENGTH = 7_000_000; // ~5 MB file

export const PdfRequestSchema = z.object({
  data: z.string().min(1).max(PDF_MAX_BASE64_LENGTH).regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

/** Structured output Claude returns when reading a PDF statement. */
export const PdfStatementSchema = z.object({
  isStatement: z.boolean().describe('False if the document is not a bank or card statement'),
  currency: z.string().describe('ISO currency code of the amounts, e.g. USD'),
  transactions: z.array(
    z.object({
      date: z.string().describe('yyyy-MM-dd'),
      description: z.string().describe('Transaction description exactly as printed'),
      amount: z.number().describe('Positive for money out (purchases, fees), negative for money in (payments, refunds, deposits)'),
    })
  ),
});
export type PdfStatement = z.infer<typeof PdfStatementSchema>;

// ---------- Bank connections ----------

/** A connection as the browser sees it. Access tokens never leave the server. */
export interface BankConnectionView {
  id: string;
  provider: string;
  institution: { id: string; name: string };
  accounts: SourceAccount[];
  createdAt: string;
  /** When the browser last confirmed an import from this connection. */
  lastSyncedAt: string | null;
}

export interface BankInstitution {
  id: string;
  name: string;
}

export const ExchangeRequestSchema = z.object({
  publicToken: z.string().min(1).max(500),
});

export const SyncRequestSchema = z.object({ connectionId: z.string().min(1).max(200) });

export interface SyncResponse {
  connectionId: string;
  transactions: SourceTransaction[];
  /** Transaction ids the bank withdrew since the last sync (e.g. a pending charge that posted under a new id). */
  removed: string[];
  /** Send back to /api/bank/ack once the import is saved, so the next sync starts after it. */
  nextCursor: string;
}

export const AckRequestSchema = z.object({
  connectionId: z.string().min(1).max(200),
  cursor: z.string().min(1).max(5000),
});
