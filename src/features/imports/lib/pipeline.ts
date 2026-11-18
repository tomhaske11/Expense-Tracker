import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Expense, ExpenseCategory } from '@/features/expenses/types';
import { EXPENSE_CATEGORIES } from '@/features/expenses/constants';
import { formatDate, generateId, normalizeVendor } from '@/lib/utils';
import { ImportBatch, ImportOrigin, ReviewItem, ReviewStatus, SourceTransaction } from '@/features/imports/types';

/*
 * The import pipeline, shared by every source. Pure functions:
 *   buildReview()          classify, dedupe and pre-categorize a batch against existing expenses
 *   applySuggestions()     merge Claude's categories and vendor names for the leftovers
 *   toExpenses()           turn the approved items into expenses with their `source`
 */

/** Days apart two charges can be and still count as the same expense. */
const DUPLICATE_WINDOW_DAYS = 3;

const TRANSFER_PATTERN =
  /\b(transfer|xfer|payment\s*-?\s*thank\s*you|autopay|auto\s*pay|credit\s*card\s*payment|card\s*payment|online\s*payment|epay|ach\s*pmt|zelle\s*to\s*(self|savings)|to\s*savings|from\s*checking)\b/i;

/** Source category hints (Plaid-style primary categories and common bank labels) -> our categories. */
const HINTS: Record<string, ExpenseCategory | 'transfer' | 'money-in'> = {
  FOOD_AND_DRINK: 'Food',
  GROCERIES: 'Food',
  RESTAURANTS: 'Food',
  TRANSPORTATION: 'Transportation',
  TRAVEL: 'Transportation',
  GAS: 'Transportation',
  ENTERTAINMENT: 'Entertainment',
  GENERAL_MERCHANDISE: 'Shopping',
  SHOPPING: 'Shopping',
  HOME_IMPROVEMENT: 'Shopping',
  RENT_AND_UTILITIES: 'Bills',
  UTILITIES: 'Bills',
  LOAN_PAYMENTS: 'Bills',
  BANK_FEES: 'Bills',
  GENERAL_SERVICES: 'Bills',
  MEDICAL: 'Other',
  PERSONAL_CARE: 'Other',
  GOVERNMENT_AND_NON_PROFIT: 'Other',
  TRANSFER_IN: 'transfer',
  TRANSFER_OUT: 'transfer',
  INCOME: 'money-in',
};

const hint = (raw?: string) => (raw ? HINTS[raw.toUpperCase().replace(/[\s-]+/g, '_')] : undefined);

/** Payment-processor prefixes and noise that hide the merchant name. */
const PREFIXES = /^(sq\s*\*|tst\s*\*|sp\s*\*|paypal\s*\*|pp\s*\*|pos\s+(debit|purchase)?\s*|debit\s+card\s+purchase\s*-?\s*|purchase\s+authorized\s+on\s+\d+\/\d+\s*|checkcard\s+\d+\s*)/i;

/** A readable vendor name from a raw bank description when nothing better is known. */
export function tidyDescription(raw: string): string {
  const cleaned = raw
    .replace(PREFIXES, '')
    .replace(/#\s*\d+/g, ' ')
    .replace(/\b\d{3,}\b/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const words = cleaned.split(' ').slice(0, 4);
  const titled = words.map((w) => (w.length <= 3 && w === w.toUpperCase() && /[A-Z]/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()));
  return titled.join(' ').slice(0, 100) || raw.slice(0, 100);
}

interface VendorHistory {
  key: string;
  tokens: string[];
  category: ExpenseCategory;
  description: string;
}

/** For each vendor the user already has, the category and spelling they use most. */
function buildHistory(existing: Expense[]): VendorHistory[] {
  const byKey = new Map<string, { categories: Map<ExpenseCategory, number>; names: Map<string, number> }>();
  for (const e of existing) {
    const key = normalizeVendor(e.description);
    if (key.length < 3) continue;
    const entry = byKey.get(key) ?? { categories: new Map(), names: new Map() };
    entry.categories.set(e.category, (entry.categories.get(e.category) ?? 0) + 1);
    entry.names.set(e.description.trim(), (entry.names.get(e.description.trim()) ?? 0) + 1);
    byKey.set(key, entry);
  }
  const top = <T,>(m: Map<T, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return [...byKey.entries()]
    .map(([key, v]) => ({ key, tokens: key.split(' '), category: top(v.categories), description: top(v.names) }))
    // Longer, more specific names first ("whole foods market" before "whole foods").
    .sort((a, b) => b.key.length - a.key.length);
}

/** The user's known vendor that this transaction names, if any. */
function matchHistory(history: VendorHistory[], text: string): VendorHistory | undefined {
  const key = normalizeVendor(text);
  if (!key) return undefined;
  const tokens = new Set(key.split(' '));
  return history.find((h) => key === h.key || h.tokens.every((t) => tokens.has(t)));
}

/** Loose vendor match for duplicate detection: a shared significant word. */
function similarVendor(a: string, b: string): boolean {
  const ta = new Set(normalizeVendor(a).split(' ').filter((t) => t.length >= 3));
  return normalizeVendor(b)
    .split(' ')
    .some((t) => t.length >= 3 && ta.has(t));
}

function classify(
  tx: SourceTransaction,
  existingByExternalId: Map<string, Expense>,
  existing: Expense[],
  usedMatches: Set<string>
): { status: ReviewStatus; matchId?: string; note?: string } {
  const imported = existingByExternalId.get(tx.externalId);
  if (imported) return { status: 'already-imported', matchId: imported.id, note: 'Already imported.' };
  if (tx.pending) return { status: 'pending', note: 'Still pending; it will be offered again once it posts.' };
  const hinted = hint(tx.categoryHint);
  if (tx.amount <= 0 || hinted === 'money-in') return { status: 'money-in', note: 'Money in (refund, deposit or credit), not an expense.' };
  if (hinted === 'transfer' || TRANSFER_PATTERN.test(tx.description)) {
    return { status: 'transfer', note: 'Looks like a transfer or card payment; importing it would count the spending twice.' };
  }
  if (tx.currency.toUpperCase() !== 'USD') {
    return { status: 'other-currency', note: `In ${tx.currency.toUpperCase()}; amounts are tracked in USD.` };
  }

  const cents = Math.round(tx.amount * 100);
  const names = [tx.merchantName, tx.description].filter((n): n is string => Boolean(n));
  const match = existing.find((e) => {
    if (usedMatches.has(e.id) || Math.round(e.amount * 100) !== cents) return false;
    const days = Math.abs(differenceInCalendarDays(parseISO(e.date), parseISO(tx.date)));
    if (days > DUPLICATE_WINDOW_DAYS) return false;
    const theirs = [e.description, e.source?.rawDescription].filter((n): n is string => Boolean(n));
    if (names.some((a) => theirs.some((b) => similarVendor(a, b)))) return true;
    // Same exact, non-round amount within a day is a strong signal even when the names differ
    // ("WHOLEFDS MKT #10234" vs "Whole Foods Market").
    return days <= 1 && cents % 100 !== 0;
  });
  if (match) {
    usedMatches.add(match.id);
    return { status: 'possible-duplicate', matchId: match.id, note: `Matches "${match.description}" on ${formatDate(match.date)}.` };
  }
  return { status: 'new' };
}

export interface ReviewResult {
  items: ReviewItem[];
  /** Items whose category and vendor name should come from Claude (unfamiliar vendors). */
  needsSuggestion: { key: string; description: string; merchantName?: string; amount: number; categoryHint?: string }[];
}

/** Classify, dedupe and pre-categorize a batch. Duplicate external ids inside the batch are dropped. */
export function buildReview(batch: ImportBatch, existing: Expense[]): ReviewResult {
  const history = buildHistory(existing);
  const byExternalId = new Map(existing.filter((e) => e.source).map((e) => [e.source!.externalId, e]));
  const usedMatches = new Set<string>();
  const seen = new Set<string>();
  const items: ReviewItem[] = [];
  const needsSuggestion: ReviewResult['needsSuggestion'] = [];

  for (const tx of batch.transactions) {
    if (seen.has(tx.externalId)) continue;
    seen.add(tx.externalId);

    const { status, matchId, note } = classify(tx, byExternalId, existing, usedMatches);
    const known = matchHistory(history, tx.merchantName ?? tx.description);
    const hinted = hint(tx.categoryHint);
    const hintedCategory = hinted && EXPENSE_CATEGORIES.includes(hinted as ExpenseCategory) ? (hinted as ExpenseCategory) : undefined;

    let category: ExpenseCategory = 'Other';
    let description = tx.merchantName?.trim() || tidyDescription(tx.description);
    let suggestedBy: ReviewItem['suggestedBy'] = 'default';
    if (known) {
      category = known.category;
      description = known.description;
      suggestedBy = 'history';
    } else if (hintedCategory && tx.merchantName) {
      category = hintedCategory;
      suggestedBy = 'source';
    } else if (hintedCategory) {
      category = hintedCategory;
    }

    const item: ReviewItem = {
      key: `${batch.origin.kind}:${tx.externalId}`,
      transaction: tx,
      status,
      include: status === 'new',
      date: tx.date,
      amount: Math.round(Math.abs(tx.amount) * 100) / 100,
      category,
      description,
      suggestedBy,
      ...(matchId && { matchId }),
      ...(note && { note }),
    };
    items.push(item);

    // Only spending that could be imported is worth a Claude call.
    const importable = status === 'new' || status === 'possible-duplicate';
    if (importable && suggestedBy !== 'history' && suggestedBy !== 'source') {
      needsSuggestion.push({
        key: item.key,
        description: tx.description,
        ...(tx.merchantName && { merchantName: tx.merchantName }),
        amount: item.amount,
        ...(tx.categoryHint && { categoryHint: tx.categoryHint }),
      });
    }
  }

  items.sort((a, b) => b.date.localeCompare(a.date));
  return { items, needsSuggestion };
}

/** Merge Claude's suggestions into the review. Edits the user already made are kept. */
export function applySuggestions(
  items: ReviewItem[],
  suggestions: { key: string; category: ExpenseCategory; description: string }[],
  editedKeys: Set<string> = new Set()
): ReviewItem[] {
  const byKey = new Map(suggestions.map((s) => [s.key, s]));
  return items.map((item) => {
    const s = byKey.get(item.key);
    if (!s || editedKeys.has(item.key) || item.suggestedBy === 'history') return item;
    return { ...item, category: s.category, description: s.description, suggestedBy: 'claude' };
  });
}

/** The approved items as expenses, each recording where it came from. */
export function toExpenses(items: ReviewItem[], origin: ImportOrigin, now = new Date()): Expense[] {
  const stamp = now.toISOString();
  return items
    .filter((item) => item.include && item.amount > 0 && item.description.trim())
    .map((item) => ({
      id: generateId(),
      date: item.date,
      amount: item.amount,
      category: item.category,
      description: item.description.trim().slice(0, 100),
      createdAt: stamp,
      updatedAt: stamp,
      source: {
        kind: origin.kind,
        externalId: item.transaction.externalId,
        accountId: item.transaction.accountId,
        rawDescription: item.transaction.description.slice(0, 300),
        ...(origin.kind === 'bank' && { connectionId: origin.connectionId }),
      },
    }));
}

/** A stable id for a statement row, so importing the same file twice is recognized. */
export function fileRowId(accountId: string, date: string, amount: number, description: string, occurrence: number): string {
  const text = `${accountId}|${date}|${Math.round(amount * 100)}|${description.trim().toLowerCase()}|${occurrence}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `file_${(hash >>> 0).toString(36)}`;
}
