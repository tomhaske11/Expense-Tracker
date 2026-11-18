import { format, isValid, parse } from 'date-fns';
import { SourceTransaction } from '@/features/imports/types';
import { fileRowId } from '@/features/imports/lib/pipeline';
import type { ColumnMapping } from '@/features/imports/lib/protocol';

/*
 * Statement files -> SourceTransaction[]. Runs in the browser: CSV and OFX/QFX are parsed
 * here; only a CSV's header and a few sample rows go to Claude (to map columns) when the
 * columns aren't recognized. PDFs are read on the server (see /api/imports/pdf).
 */

export const MAX_STATEMENT_BYTES = 5 * 1024 * 1024;
export type StatementKind = 'csv' | 'ofx' | 'pdf';

export function statementKind(fileName: string, head: string): StatementKind | null {
  const name = fileName.toLowerCase();
  if (name.endsWith('.pdf') || head.startsWith('%PDF')) return 'pdf';
  if (name.endsWith('.ofx') || name.endsWith('.qfx') || /<OFX>/i.test(head)) return 'ofx';
  if (name.endsWith('.csv') || name.endsWith('.txt') || name.endsWith('.tsv')) return 'csv';
  return null;
}

// ---------- CSV ----------

/** RFC 4180-style CSV parsing: quoted fields, escaped quotes, CRLF, and , ; or tab delimiters. */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = [',', ';', '\t'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim())) rows.push(row.map((f) => f.trim()));
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row.map((f) => f.trim()));
  return rows;
}

const HEADER_PATTERNS = {
  date: /^(transaction\s*)?(date|posted(\s*date)?|posting\s*date|trans(action)?\.?\s*date)$/i,
  description: /^(description|details|payee|merchant|name|transaction(\s*description)?|memo|narrative)$/i,
  amount: /^(amount|transaction\s*amount|amount\s*\(usd\))$/i,
  debit: /^(debit|withdrawals?|money\s*out|paid\s*out|charges?)$/i,
  credit: /^(credit|deposits?|money\s*in|paid\s*in|payments?)$/i,
  category: /^(category|type)$/i,
};

/** Recognize common bank CSV layouts without Claude. Returns null when unsure. */
export function guessMapping(rows: string[][]): ColumnMapping | null {
  const headerRow = rows.findIndex((r) => r.some((c) => HEADER_PATTERNS.date.test(c)));
  if (headerRow < 0 || headerRow > 10) return null;
  const header = rows[headerRow];
  const find = (p: RegExp) => header.findIndex((c) => p.test(c));
  const date = find(HEADER_PATTERNS.date);
  const description = find(HEADER_PATTERNS.description);
  const amount = find(HEADER_PATTERNS.amount);
  const debit = find(HEADER_PATTERNS.debit);
  const credit = find(HEADER_PATTERNS.credit);
  if (date < 0 || description < 0 || (amount < 0 && debit < 0)) return null;

  const data = rows.slice(headerRow + 1, headerRow + 40);
  const amounts = amount >= 0 ? data.map((r) => parseAmount(r[amount] ?? '')).filter((n): n is number => n !== null) : [];
  // Most statements list more purchases than credits: if most amounts are negative, purchases are negative.
  const negatives = amounts.filter((n) => n < 0).length;
  const category = find(HEADER_PATTERNS.category);
  return {
    headerRow,
    dateColumn: date,
    dateOrder: guessDateOrder(data.map((r) => r[date] ?? '')),
    descriptionColumn: description,
    ...(amount >= 0 ? { amountColumn: amount } : { debitColumn: debit, ...(credit >= 0 && { creditColumn: credit }) }),
    spendingIsNegative: amount >= 0 ? negatives > amounts.length / 2 : false,
    ...(category >= 0 && category !== description && { categoryColumn: category }),
    currency: 'USD',
  };
}

function guessDateOrder(values: string[]): ColumnMapping['dateOrder'] {
  if (values.some((v) => /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(v))) return 'YMD';
  // A first part above 12 can only be a day.
  if (values.some((v) => Number(v.split(/[-/.]/)[0]) > 12)) return 'DMY';
  return 'MDY';
}

/** "$1,234.56", "(12.50)", "-12,50", "1.234,56 €" -> number, or null. */
export function parseAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/-\s*$/.test(s) || s.startsWith('-')) negative = true;
  s = s.replace(/[^\d.,]/g, '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastComma > lastDot && /,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  if (!s || !Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const DATE_FORMATS: Record<ColumnMapping['dateOrder'], string[]> = {
  MDY: ['M/d/yyyy', 'M/d/yy', 'M-d-yyyy', 'M.d.yyyy', 'MMM d, yyyy', 'MMM d yyyy', 'd MMM yyyy'],
  DMY: ['d/M/yyyy', 'd/M/yy', 'd-M-yyyy', 'd.M.yyyy', 'd MMM yyyy', 'MMM d, yyyy'],
  YMD: ['yyyy-MM-dd', 'yyyy/M/d', 'yyyy.M.d', 'yyyyMMdd'],
};

/** Parse a statement date to yyyy-MM-dd, or null. */
export function parseStatementDate(raw: string, order: ColumnMapping['dateOrder']): string | null {
  const value = raw.trim().replace(/\s+\d{1,2}:\d{2}(:\d{2})?.*$/, '');
  for (const f of [...DATE_FORMATS[order], ...DATE_FORMATS.YMD]) {
    const d = parse(value, f, new Date(2000, 0, 1));
    if (isValid(d) && d.getFullYear() > 1990 && d.getFullYear() < 2100) return format(d, 'yyyy-MM-dd');
  }
  return null;
}

export interface ParsedStatement {
  transactions: SourceTransaction[];
  /** Data rows that couldn't be read (1-based line in the file), for the review summary. */
  unreadable: number[];
}

/** Apply a column mapping to CSV rows. */
export function applyMapping(rows: string[][], mapping: ColumnMapping, accountId = 'statement'): ParsedStatement {
  const transactions: SourceTransaction[] = [];
  const unreadable: number[] = [];
  const occurrences = new Map<string, number>();

  rows.slice(mapping.headerRow + 1).forEach((row, i) => {
    const line = mapping.headerRow + 2 + i;
    const date = parseStatementDate(row[mapping.dateColumn] ?? '', mapping.dateOrder);
    const description = (row[mapping.descriptionColumn] ?? '').trim();
    let amount: number | null = null;
    if (mapping.amountColumn !== undefined) {
      const value = parseAmount(row[mapping.amountColumn] ?? '');
      if (value !== null) amount = mapping.spendingIsNegative ? -value : value;
    } else if (mapping.debitColumn !== undefined) {
      const debit = parseAmount(row[mapping.debitColumn] ?? '');
      const credit = mapping.creditColumn !== undefined ? parseAmount(row[mapping.creditColumn] ?? '') : null;
      if (debit !== null || credit !== null) amount = Math.abs(debit ?? 0) - Math.abs(credit ?? 0);
    }
    if (!date || !description || amount === null || amount === 0) {
      unreadable.push(line);
      return;
    }
    const base = `${date}|${amount}|${description.toLowerCase()}`;
    const n = (occurrences.get(base) ?? 0) + 1;
    occurrences.set(base, n);
    transactions.push({
      externalId: fileRowId(accountId, date, amount, description, n),
      accountId,
      date,
      amount: Math.round(amount * 100) / 100,
      currency: mapping.currency || 'USD',
      description,
      pending: false,
      ...(mapping.categoryColumn !== undefined && row[mapping.categoryColumn] && { categoryHint: row[mapping.categoryColumn] }),
    });
  });
  return { transactions, unreadable };
}

// ---------- OFX / QFX ----------

/** OFX/QFX bank downloads: uses the bank's own transaction ids (FITID). */
export function parseOfx(text: string): ParsedStatement {
  const field = (block: string, tag: string) => block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'))?.[1].trim();
  const accountId = field(text, 'ACCTID') ?? 'ofx';
  const currency = field(text, 'CURDEF') ?? 'USD';
  const transactions: SourceTransaction[] = [];
  const unreadable: number[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  blocks.forEach((raw, i) => {
    const block = raw.split(/<\/STMTTRN>/i)[0];
    const posted = field(block, 'DTPOSTED');
    const amount = parseAmount(field(block, 'TRNAMT') ?? '');
    const name = field(block, 'NAME') ?? '';
    const memo = field(block, 'MEMO') ?? '';
    const date = posted && /^\d{8}/.test(posted) ? `${posted.slice(0, 4)}-${posted.slice(4, 6)}-${posted.slice(6, 8)}` : null;
    const description = [name, memo && memo !== name ? memo : ''].filter(Boolean).join(' ').trim();
    if (!date || amount === null || amount === 0 || !description) {
      unreadable.push(i + 1);
      return;
    }
    const id = field(block, 'FITID');
    transactions.push({
      // OFX amounts are negative for money out; ours are positive for spending.
      externalId: id ? `ofx_${accountId}_${id}` : fileRowId(accountId, date, -amount, description, i),
      accountId,
      date,
      amount: Math.round(-amount * 100) / 100,
      currency,
      description,
      pending: false,
    });
  });
  return { transactions, unreadable };
}
