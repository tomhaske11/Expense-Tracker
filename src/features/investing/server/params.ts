import 'server-only';
import { isValidSymbol, normalizeSymbol } from '@/features/investing/lib/types';

/** Parse a comma-separated symbol list from a query string: valid, unique, at most `max`. Null if invalid. */
export function parseSymbols(raw: string | null, max: number): string[] | null {
  if (!raw) return [];
  const symbols = [...new Set(raw.split(',').map(normalizeSymbol).filter(Boolean))];
  if (symbols.length > max || !symbols.every(isValidSymbol)) return null;
  return symbols;
}
