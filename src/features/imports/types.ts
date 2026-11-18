import { ExpenseCategory } from '@/features/expenses/types';

/*
 * The shared shape every import source produces: bank providers (mock today, Plaid etc.
 * later) and statement files (CSV, OFX/QFX, PDF). The pipeline only ever sees these.
 * Modeled on bank aggregator APIs so a real provider maps onto it directly.
 */
export interface SourceTransaction {
  /** Stable id at the source; re-imports with the same id are recognized as already imported. */
  externalId: string;
  accountId: string;
  /** yyyy-MM-dd, the date the transaction happened (not when it posted). */
  date: string;
  /** Positive = money out (a purchase); negative = money in (refund, deposit, payment received). */
  amount: number;
  /** ISO 4217, e.g. "USD". */
  currency: string;
  /** Raw description from the bank or statement, e.g. "SQ *BLUE BOTTLE #12 OAKLAND CA". */
  description: string;
  /** Clean merchant name when the source provides one. */
  merchantName?: string;
  /** Not yet posted; amounts and descriptions can still change. */
  pending: boolean;
  /** The source's own category, if any (e.g. Plaid's "FOOD_AND_DRINK"). Used only as a hint. */
  categoryHint?: string;
}

export interface SourceAccount {
  id: string;
  name: string;
  /** Last 4 digits, for display. */
  mask?: string;
  type: 'checking' | 'savings' | 'credit' | 'other';
}

/** Where a batch came from, recorded on every imported expense. */
export type ImportOrigin =
  | { kind: 'bank'; connectionId: string; label: string }
  | { kind: 'file'; fileName: string; label: string };

export interface ImportBatch {
  origin: ImportOrigin;
  transactions: SourceTransaction[];
}

/** Why a transaction is or isn't offered for import. */
export type ReviewStatus =
  | 'new'
  | 'already-imported' // same external id as an existing expense
  | 'possible-duplicate' // matches an existing expense by date, amount and vendor
  | 'pending'
  | 'money-in' // refund, deposit or other credit
  | 'transfer' // card payment or move between accounts; importing would double-count
  | 'other-currency';

/** One transaction in the review list, with the fields the user can edit before saving. */
export interface ReviewItem {
  key: string;
  transaction: SourceTransaction;
  status: ReviewStatus;
  /** Whether it will be imported; defaults to true only for 'new'. */
  include: boolean;
  date: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  /** How category and description were chosen. 'claude' items are filled in after the Claude step. */
  suggestedBy: 'history' | 'source' | 'claude' | 'default';
  /** Existing expense this one matches, for duplicate statuses. */
  matchId?: string;
  note?: string;
}
