import { z } from 'zod';
import { EXPENSE_CATEGORIES, QUICK_ADD_MAX_LENGTH } from '@/features/expenses/constants';
import { ExpenseCategory } from '@/features/expenses/types';

/*
 * Shared contract for natural-language quick add (POST /api/quick-add).
 * Used by the API route (validation) and the client (types only).
 */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const QuickAddRequestSchema = z.object({
  text: z.string().trim().min(1).max(QUICK_ADD_MAX_LENGTH),
  /** The user's local date (yyyy-MM-dd), so "yesterday" resolves in their timezone. */
  today: z.string().regex(ISO_DAY),
});
export type QuickAddRequest = z.infer<typeof QuickAddRequestSchema>;

/** Shape Claude must return (structured output). Kept free of regex/format constraints. */
export const ParsedExpenseSchema = z.object({
  amount: z
    .number()
    .nullable()
    .describe('Amount in US dollars, or null if the note gives no amount'),
  date: z.string().describe('Date of the expense as yyyy-MM-dd'),
  category: z.enum(EXPENSE_CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]]),
  description: z
    .string()
    .describe('Short vendor or item name in title case, e.g. "Chipotle" or "Uber to airport"'),
  note: z
    .string()
    .nullable()
    .describe('One short sentence about anything assumed or missing, or null'),
});
export type ParsedExpense = z.infer<typeof ParsedExpenseSchema>;

export const isIsoDay = (value: string) => ISO_DAY.test(value);

/** Image types Claude accepts. The browser re-encodes receipts as JPEG before upload. */
export const RECEIPT_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
/** Max base64 length of an uploaded receipt (~3.75 MB of image data). */
export const RECEIPT_MAX_BASE64_LENGTH = 5_000_000;

export const ReceiptRequestSchema = z.object({
  image: z.object({
    mediaType: z.enum(RECEIPT_MEDIA_TYPES),
    data: z.string().min(1).max(RECEIPT_MAX_BASE64_LENGTH).regex(/^[A-Za-z0-9+/]+={0,2}$/),
  }),
  today: z.string().regex(ISO_DAY),
});
export type ReceiptRequest = z.infer<typeof ReceiptRequestSchema>;
