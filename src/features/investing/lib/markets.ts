/*
 * The market overview. Indexes are shown through the funds that track them (an S&P 500 fund
 * rather than the index itself): index values need their own data licence, fund prices don't.
 */
export const MARKET_INDEXES = [
  { symbol: 'SPY', name: 'S&P 500' },
  { symbol: 'QQQ', name: 'Nasdaq-100' },
  { symbol: 'DIA', name: 'Dow Jones' },
  { symbol: 'IWM', name: 'Russell 2000' },
] as const;

export const INDEX_SYMBOLS: string[] = MARKET_INDEXES.map((i) => i.symbol);

export const DISCLAIMER =
  'For information only, not investment advice. Index figures are the prices of funds that track each index.';
